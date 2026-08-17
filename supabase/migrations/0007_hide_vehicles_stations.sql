-- Vehicles/stations with fill history can't be hard-deleted (foreign_key_
-- violation, deliberate). "Hidden" is the escape hatch: it just removes
-- the item from pickers going forward, without touching any fill history.
alter table vehicles add column hidden boolean not null default false;
alter table stations add column hidden boolean not null default false;
