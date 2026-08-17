-- Policies on group_members that subquery group_members itself trigger
-- Postgres's RLS self-reference guard ("infinite recursion detected in
-- policy for relation group_members"), even though the query itself isn't
-- actually infinite. Standard fix: move the lookup into a security-definer
-- helper function, which runs as the (RLS-exempt) function owner and so
-- doesn't re-trigger the policy it's being used from.
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

drop policy "members can view their groups" on groups;
create policy "members can view their groups" on groups
  for select
  using (id in (select public.my_group_ids()));

drop policy "members can view their group roster" on group_members;
create policy "members can view their group roster" on group_members
  for select
  using (group_id in (select public.my_group_ids()));

drop policy "owners can invite members" on group_members;
create policy "owners can invite members" on group_members
  for insert
  with check (public.is_group_owner(group_id));

drop policy "group members can access vehicles" on vehicles;
create policy "group members can access vehicles" on vehicles
  for all
  using (group_id in (select public.my_group_ids()))
  with check (group_id in (select public.my_group_ids()));

drop policy "group members can access stations" on stations;
create policy "group members can access stations" on stations
  for all
  using (group_id in (select public.my_group_ids()))
  with check (group_id in (select public.my_group_ids()));

drop policy "group members can access fills" on fills;
create policy "group members can access fills" on fills
  for all
  using (
    vehicle_id in (select v.id from vehicles v where v.group_id in (select public.my_group_ids()))
  )
  with check (
    vehicle_id in (select v.id from vehicles v where v.group_id in (select public.my_group_ids()))
  );
