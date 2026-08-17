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
-- up. The trigger below auto-converts a pending invite into an accepted
-- membership the moment someone signs up with the invited email.
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
  created_at timestamptz not null default now(),
  constraint group_members_user_unique unique (group_id, user_id),
  constraint group_members_status_shape check (
    (status = 'accepted' and user_id is not null) or
    (status = 'pending' and user_id is null)
  )
);

-- Only one pending invite per email per group (accepted members are
-- deduplicated separately by group_members_user_unique above).
create unique index group_members_pending_email_idx
  on group_members (group_id, email)
  where status = 'pending';

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

-- When someone signs up with an email that has a pending invite, attach
-- them to that group automatically instead of leaving the invite stale.
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

-- Vehicles/stations move from globally-unique names to unique-per-group.
alter table vehicles add column group_id bigint references groups (id);
alter table stations add column group_id bigint references groups (id);

alter table vehicles drop constraint vehicles_name_key;
alter table stations drop constraint stations_name_key;

alter table vehicles add constraint vehicles_group_name_unique unique (group_id, name);
alter table stations add constraint stations_group_name_unique unique (group_id, name);

-- Replace open "public access" policies with group-membership checks.
drop policy "public access" on vehicles;
drop policy "public access" on stations;
drop policy "public access" on fills;

alter table groups enable row level security;
alter table group_members enable row level security;

create policy "members can view their groups" on groups
  for select
  using (
    id in (select group_id from group_members where user_id = auth.uid() and status = 'accepted')
  );

create policy "members can view their group roster" on group_members
  for select
  using (
    group_id in (
      select group_id from group_members gm2
      where gm2.user_id = auth.uid() and gm2.status = 'accepted'
    )
  );

create policy "owners can invite members" on group_members
  for insert
  with check (
    exists (
      select 1 from group_members gm2
      where gm2.group_id = group_members.group_id
        and gm2.user_id = auth.uid()
        and gm2.role = 'owner'
        and gm2.status = 'accepted'
    )
  );

create policy "group members can access vehicles" on vehicles
  for all
  using (
    group_id in (select group_id from group_members where user_id = auth.uid() and status = 'accepted')
  )
  with check (
    group_id in (select group_id from group_members where user_id = auth.uid() and status = 'accepted')
  );

create policy "group members can access stations" on stations
  for all
  using (
    group_id in (select group_id from group_members where user_id = auth.uid() and status = 'accepted')
  )
  with check (
    group_id in (select group_id from group_members where user_id = auth.uid() and status = 'accepted')
  );

create policy "group members can access fills" on fills
  for all
  using (
    vehicle_id in (
      select v.id from vehicles v
      join group_members gm on gm.group_id = v.group_id
      where gm.user_id = auth.uid() and gm.status = 'accepted'
    )
  )
  with check (
    vehicle_id in (
      select v.id from vehicles v
      join group_members gm on gm.group_id = v.group_id
      where gm.user_id = auth.uid() and gm.status = 'accepted'
    )
  );

-- Access now requires a logged-in session; the anon key alone is no longer enough.
revoke all on vehicles, stations, fills from anon;
grant select, insert, update, delete on vehicles, stations, fills, groups, group_members to authenticated;
grant usage, select on all sequences in schema public to authenticated;
