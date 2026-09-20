-- Aggregated fuel statistics, computed in Postgres so the numbers are exact
-- (used by the MCP `get_stats` tool). security invoker: runs with the
-- caller's rights, so RLS limits it to the caller's own groups.
--
-- Consumption uses the full-tank method: the fuel added at a fill covers the
-- distance since the previous fill of the same vehicle. The previous fill may
-- be outside the requested period (lag runs over the whole history). Fills
-- whose odometer isn't above the previous one (typos) are ignored for
-- distance/consumption. Rows are grouped per unit set so km/mi or L/gal are
-- never mixed. p_to is exclusive.
create or replace function public.fuel_stats(
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_vehicle_id bigint default null
)
returns table (
  vehicle_id bigint,
  vehicle text,
  currency text,
  volume_unit text,
  distance_unit text,
  fills_count bigint,
  total_cost numeric,
  total_volume numeric,
  avg_price_per_unit numeric,
  total_distance numeric,
  consumption_per_100 numeric,
  first_fill timestamptz,
  last_fill timestamptz
)
language sql
stable
security invoker
set search_path = public
as $$
  with seq as (
    select f.vehicle_id as vid, v.name as vname, f.currency as cur, f.volume_unit as vu,
           f.distance_unit as du, f.date as fdate, f.total_cost as cost, f.volume as vol,
           f.odometer - lag(f.odometer) over (
             partition by f.vehicle_id, f.distance_unit order by f.date, f.id
           ) as dist
    from fills f
    join vehicles v on v.id = f.vehicle_id
    where p_vehicle_id is null or f.vehicle_id = p_vehicle_id
  )
  select vid, vname, cur, vu, du,
         count(*),
         round(sum(cost), 2),
         round(sum(vol), 2),
         round(sum(cost) / nullif(sum(vol), 0), 3),
         sum(dist) filter (where dist > 0),
         round(100 * sum(vol) filter (where dist > 0) / nullif(sum(dist) filter (where dist > 0), 0), 2),
         min(fdate),
         max(fdate)
  from seq
  where (p_from is null or fdate >= p_from)
    and (p_to is null or fdate < p_to)
  group by vid, vname, cur, vu, du
  order by vname, cur
$$;

grant execute on function public.fuel_stats(timestamptz, timestamptz, bigint) to authenticated, service_role;
