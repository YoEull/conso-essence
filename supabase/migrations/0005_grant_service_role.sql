-- service_role (used by admin/server-side scripts, e.g. the Admin API and
-- the dev test fixtures) never received explicit table grants on the
-- group-related tables, unlike authenticated. RLS-bypass alone doesn't
-- substitute for the underlying Postgres GRANT.
grant select, insert, update, delete on vehicles, stations, fills, groups, group_members to service_role;
grant usage, select on all sequences in schema public to service_role;
