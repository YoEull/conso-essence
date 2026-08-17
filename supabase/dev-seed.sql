-- Dev-only test fixture. Safe to re-run anytime: it always cleans up its
-- own rows first (matched by name), so re-running never creates duplicates.
-- Never run this against prod.
--
-- Scenario: two groups, both including your real account
-- (yoann.eulalie@gmail.com) so you can verify multi-group visibility from
-- your own session — owner of A, plain member of B — plus a pending invite
-- in A to check roster rendering. Creating a second *real* auth account is
-- the only way to test cross-account isolation end to end; this fixture
-- covers everything that can be checked from a single account.

delete from vehicles where group_id in (
  select id from groups where name in ('Groupe Test A', 'Groupe Test B', 'Groupe Test (voisins)')
);
delete from stations where group_id in (
  select id from groups where name in ('Groupe Test A', 'Groupe Test B', 'Groupe Test (voisins)')
);
delete from groups where name in ('Groupe Test A', 'Groupe Test B', 'Groupe Test (voisins)');

do $$
declare
  group_a_id bigint;
  group_b_id bigint;
  my_user_id uuid := 'c138adb3-ca80-47e7-97eb-a6961074dd53';
  my_email text := 'yoann.eulalie@gmail.com';
begin
  insert into groups (name) values ('Groupe Test A') returning id into group_a_id;
  insert into groups (name) values ('Groupe Test B') returning id into group_b_id;

  insert into group_members (group_id, user_id, email, role, status) values
    (group_a_id, my_user_id, my_email, 'owner', 'accepted'),
    (group_b_id, my_user_id, my_email, 'member', 'accepted');

  insert into group_members (group_id, email, role, status)
  values (group_a_id, 'user_test_b@example.com', 'member', 'pending');

  insert into vehicles (group_id, name) values
    (group_a_id, 'Vehicule Test A'),
    (group_b_id, 'Vehicule Test B');

  insert into stations (group_id, name) values
    (group_a_id, 'Station Test A'),
    (group_b_id, 'Station Test B');
end $$;
