-- Hiding a group is a lighter-weight archive than deleting it (which stays
-- blocked while it has vehicles/stations): it removes every vehicle and
-- station in the group from pickers, without touching any data. Covered by
-- the existing "owners can rename their group" UPDATE policy — it isn't
-- scoped to specific columns.
alter table groups add column hidden boolean not null default false;
