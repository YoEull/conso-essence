create table vehicles (
  id bigint generated always as identity primary key,
  name text not null unique
);

create table stations (
  id bigint generated always as identity primary key,
  name text not null unique
);

-- Every fill is self-describing: it stores exactly what was entered,
-- including the unit/currency it was entered in (single source of truth,
-- no conversion on write). volume_unit/distance_unit/currency default to
-- whatever's set in Paramètres at entry time, but can be corrected per
-- fill later (e.g. a trip abroad) without affecting other entries.
create table fills (
  id bigint generated always as identity primary key,
  vehicle_id bigint not null references vehicles (id),
  station_id bigint not null references stations (id),
  date timestamptz not null default now(),
  odometer numeric not null,
  distance_unit text not null default 'km' check (distance_unit in ('km', 'mi')),
  price_per_unit numeric not null,
  volume numeric not null,
  volume_unit text not null default 'L' check (volume_unit in ('L', 'gal_us', 'gal_uk')),
  total_cost numeric not null,
  currency text not null default 'EUR'
    check (currency in ('EUR', 'USD', 'GBP', 'JPY', 'CNY', 'CAD', 'INR', 'KRW', 'CHF', 'AUD'))
);

alter table vehicles enable row level security;
alter table stations enable row level security;
alter table fills enable row level security;

create policy "public access" on vehicles for all using (true) with check (true);
create policy "public access" on stations for all using (true) with check (true);
create policy "public access" on fills for all using (true) with check (true);

grant select, insert, update, delete on vehicles, stations, fills to anon;
grant usage, select on all sequences in schema public to anon;
