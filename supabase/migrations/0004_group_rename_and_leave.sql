-- Owners can rename their group directly (simpler and more robust than
-- trying to keep an auto-generated name in sync with anyone's pseudo).
create policy "owners can rename their group" on groups
  for update
  using (public.is_group_owner(id))
  with check (public.is_group_owner(id));

-- A plain member can remove themselves from a group they were invited into.
-- Deliberately excludes owners: a group must always keep its owner, so
-- leaving isn't offered to them from this policy (ownership transfer would
-- be a separate feature if ever needed).
create policy "members can leave a group" on group_members
  for delete
  using (user_id = auth.uid() and role = 'member');
