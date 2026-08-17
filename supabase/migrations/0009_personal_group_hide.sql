-- Hiding a group is a personal view preference (declutter your own
-- pickers), not a shared/structural change like rename or delete — so it
-- belongs on the membership row, not the group itself. Anyone can hide a
-- group they're in, independent of the other members' view.
alter table groups drop column hidden;
alter table group_members add column hidden boolean not null default false;

-- Column-level grant, not a table-level one: members can flip their own
-- "hidden" flag, but RLS row-scoping alone wouldn't stop them from also
-- rewriting their own role/status through the same UPDATE endpoint.
revoke update on group_members from authenticated;
grant update (hidden) on group_members to authenticated;

create policy "members can hide a group for themselves" on group_members
  for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
