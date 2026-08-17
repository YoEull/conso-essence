create policy "owners can delete their group" on groups
  for delete
  using (public.is_group_owner(id));
