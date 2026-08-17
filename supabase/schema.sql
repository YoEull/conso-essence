-- Groups are the sharing boundary: every vehicle/station (and by extension
-- every fill, via its vehicle) belongs to exactly one group, and every
-- member of that group can see and edit everything in it (all-or-nothing
-- sharing per group). A user can belong to several groups at once: they
-- then see the union of everything across their groups, with no notion of
-- a "current active group" to switch between. Two groups with no common
-- member are fully isolated from each other.
create table groups (
  id bigint generated always as identity primary key,
  name text not null,
  created_at timestamptz not null default now()
);

-- A member row is either an accepted member (user_id set) or a pending
-- invite (invited by email, user_id null) waiting for that person to sign
-- up. A trigger on auth.users auto-converts a pending invite into an
-- accepted membership the moment someone signs up with the invited email.
-- hidden: whether *this member* has hidden the group from their own
-- pickers — a personal view preference, not a shared/structural change
-- like rename or delete, so it lives on the membership row rather than on
-- the group itself. Anyone can hide a group they're in, independent of
-- what other members see.
create table group_members (
  id bigint generated always as identity primary key,
  group_id bigint not null references groups (id) on delete cascade,
  user_id uuid references auth.users (id) on delete cascade,
  -- Denormalized on purpose: auth.users isn't exposed through the client
  -- API, so this is the only way the app can display who's in a group
  -- (both while an invite is pending and once it's accepted).
  email text not null,
  role text not null default 'member' check (role in ('owner', 'member')),
  status text not null default 'accepted' check (status in ('pending', 'accepted')),
  hidden boolean not null default false,
  created_at timestamptz not null default now(),
  constraint group_members_user_unique unique (group_id, user_id),
  constraint group_members_status_shape check (
    (status = 'accepted' and user_id is not null) or
    (status = 'pending' and user_id is null)
  )
);

create unique index group_members_pending_email_idx
  on group_members (group_id, email)
  where status = 'pending';

-- A vehicle (and everything entered against it) belongs to exactly one
-- group. Stations belong to a group too, but duplicates across groups (two
-- groups independently adding "the same" gas station) are harmless.
-- hidden: vehicles/stations with fill history can't be hard-deleted
-- (foreign_key_violation, deliberate) — this is the escape hatch, removing
-- the item from pickers going forward without touching fill history.
create table vehicles (
  id bigint generated always as identity primary key,
  group_id bigint not null references groups (id),
  name text not null,
  hidden boolean not null default false,
  constraint vehicles_group_name_unique unique (group_id, name)
);

create table stations (
  id bigint generated always as identity primary key,
  group_id bigint not null references groups (id),
  name text not null,
  hidden boolean not null default false,
  constraint stations_group_name_unique unique (group_id, name)
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

-- Creates a group and makes the caller its owner, atomically. This is the
-- only way to create a group: it bypasses RLS (security definer) so it
-- works even though group_members has no "bootstrap" insert policy for the
-- very first member.
create function public.create_group(group_name text)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  new_id bigint;
  caller_email text := auth.jwt() ->> 'email';
begin
  insert into groups (name) values (group_name) returning id into new_id;
  insert into group_members (group_id, user_id, email, role, status)
  values (new_id, auth.uid(), caller_email, 'owner', 'accepted');
  return new_id;
end;
$$;

grant execute on function public.create_group(text) to authenticated;

create function public.attach_pending_group_invites()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update group_members
  set user_id = new.id, status = 'accepted'
  where status = 'pending' and email = new.email;
  return new;
end;
$$;

create trigger on_auth_user_created_attach_invites
  after insert on auth.users
  for each row execute function public.attach_pending_group_invites();

alter table groups enable row level security;
alter table group_members enable row level security;
alter table vehicles enable row level security;
alter table stations enable row level security;
alter table fills enable row level security;

-- A policy on group_members that subqueries group_members itself triggers
-- Postgres's RLS self-reference guard ("infinite recursion detected in
-- policy for relation group_members"). These security-definer helpers run
-- as the (RLS-exempt) function owner, so using them from a policy doesn't
-- re-trigger the policy it's being evaluated from.
create function public.my_group_ids()
returns setof bigint
language sql
security definer
stable
set search_path = public
as $$
  select group_id from group_members where user_id = auth.uid() and status = 'accepted';
$$;

grant execute on function public.my_group_ids() to authenticated;

create function public.is_group_owner(check_group_id bigint)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from group_members
    where group_id = check_group_id and user_id = auth.uid() and role = 'owner' and status = 'accepted'
  );
$$;

grant execute on function public.is_group_owner(bigint) to authenticated;

create policy "members can view their groups" on groups
  for select
  using (id in (select public.my_group_ids()));

-- Owners can rename their group directly (simpler and more robust than
-- trying to keep an auto-generated name in sync with anyone's pseudo).
create policy "owners can rename their group" on groups
  for update
  using (public.is_group_owner(id))
  with check (public.is_group_owner(id));

create policy "owners can delete their group" on groups
  for delete
  using (public.is_group_owner(id));

create policy "members can view their group roster" on group_members
  for select
  using (group_id in (select public.my_group_ids()));

create policy "owners can invite members" on group_members
  for insert
  with check (public.is_group_owner(group_id));

-- A plain member can remove themselves from a group they were invited into.
-- Deliberately excludes owners: a group must always keep its owner, so
-- leaving isn't offered to them from this policy (ownership transfer would
-- be a separate feature if ever needed).
create policy "members can leave a group" on group_members
  for delete
  using (user_id = auth.uid() and role = 'member');

create policy "members can hide a group for themselves" on group_members
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "group members can access vehicles" on vehicles
  for all
  using (group_id in (select public.my_group_ids()))
  with check (group_id in (select public.my_group_ids()));

create policy "group members can access stations" on stations
  for all
  using (group_id in (select public.my_group_ids()))
  with check (group_id in (select public.my_group_ids()));

create policy "group members can access fills" on fills
  for all
  using (
    vehicle_id in (select v.id from vehicles v where v.group_id in (select public.my_group_ids()))
  )
  with check (
    vehicle_id in (select v.id from vehicles v where v.group_id in (select public.my_group_ids()))
  );

-- Access requires a logged-in session; the anon key alone is no longer enough.
-- group_members is deliberately not granted a blanket UPDATE: RLS scopes
-- *which rows* a member can touch, but not *which columns* — without this
-- split, "members can hide a group for themselves" would also let a member
-- rewrite their own role to 'owner'. Only the hidden column is writable.
grant select, insert, delete on vehicles, stations, fills, groups, group_members to authenticated;
grant update on vehicles, stations, fills, groups to authenticated;
grant update (hidden) on group_members to authenticated;
grant usage, select on all sequences in schema public to authenticated;

-- service_role (admin scripts, e.g. the dev test fixtures) needs the same
-- table grants — RLS-bypass alone doesn't substitute for the underlying
-- Postgres GRANT.
grant select, insert, update, delete on vehicles, stations, fills, groups, group_members to service_role;
grant usage, select on all sequences in schema public to service_role;
