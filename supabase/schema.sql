create table vehicles (
  id bigint generated always as identity primary key,
  name text not null unique
);

create table stations (
  id bigint generated always as identity primary key,
  name text not null unique
);

create table fills (
  id bigint generated always as identity primary key,
  vehicle_id bigint not null references vehicles (id),
  station_id bigint not null references stations (id),
  date timestamptz not null default now(),
  mileage numeric not null,
  price_per_liter numeric not null,
  liters numeric not null,
  total_cost numeric not null
);

alter table vehicles enable row level security;
alter table stations enable row level security;
alter table fills enable row level security;

create policy "public access" on vehicles for all using (true) with check (true);
create policy "public access" on stations for all using (true) with check (true);
create policy "public access" on fills for all using (true) with check (true);

grant select, insert, update, delete on vehicles, stations, fills to anon;
grant usage, select on all sequences in schema public to anon;
