// Dev-only regression test for the groups/RLS layer. Requires
// SUPABASE_SERVICE_ROLE_KEY (never commit it, never use it client-side).
// Run with: node --env-file=.env.local scripts/test-group-isolation.mjs
//
// Creates a real, fully-confirmed test user with a known password (no
// magic-link email needed), signs in as them, and checks what they can see
// through RLS. Their email matches the pending invite seeded by
// dev-seed.sql into "Groupe Test A", so this also exercises the
// attach_pending_group_invites trigger. Cleans up the test user afterward;
// re-run dev-seed.sql first if you need the pending invite again.

import { createClient } from "@supabase/supabase-js";
import ws from "ws";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey || !serviceKey) {
  console.error("Missing env vars: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const TEST_EMAIL = "user_test_b@example.com";
const TEST_PASSWORD = "Test-Password-1234!";

const admin = createClient(url, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
  realtime: { transport: ws },
});

function check(label, condition) {
  console.log(`${condition ? "PASS" : "FAIL"} — ${label}`);
  return condition;
}

async function main() {
  let ok = true;

  const { data: existing, error: listErr } = await admin.auth.admin.listUsers();
  if (listErr) throw listErr;
  const prior = existing.users.find((u) => u.email === TEST_EMAIL);
  if (prior) await admin.auth.admin.deleteUser(prior.id);

  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
    email_confirm: true,
  });
  if (createErr) throw createErr;
  console.log(`Created test user ${created.user.id}`);

  const asTestUser = createClient(url, anonKey, { realtime: { transport: ws } });
  const { error: signInErr } = await asTestUser.auth.signInWithPassword({
    email: TEST_EMAIL,
    password: TEST_PASSWORD,
  });
  if (signInErr) throw signInErr;
  console.log("Signed in as test user.\n");

  const { data: groups, error: groupsErr } = await asTestUser.from("groups").select("id, name");
  if (groupsErr) throw groupsErr;
  const groupNames = groups.map((g) => g.name);
  console.log("Groups visible:", groupNames);

  const { data: vehicles, error: vehiclesErr } = await asTestUser.from("vehicles").select("id, name");
  if (vehiclesErr) throw vehiclesErr;
  const vehicleNames = vehicles.map((v) => v.name);
  console.log("Vehicles visible:", vehicleNames);

  const { data: members, error: membersErr } = await asTestUser
    .from("group_members")
    .select("group_id, email, role, status");
  if (membersErr) throw membersErr;
  console.log("Own memberships:", members);
  console.log();

  ok = check("sees Groupe Test A (auto-attached from pending invite)", groupNames.includes("Groupe Test A")) && ok;
  ok = check("does NOT see Groupe Test B", !groupNames.includes("Groupe Test B")) && ok;
  ok = check("does NOT see your real group", !groupNames.some((n) => n.startsWith("Groupe de "))) && ok;
  ok = check("sees Vehicule Test A", vehicleNames.includes("Vehicule Test A")) && ok;
  ok = check("does NOT see Vehicule Test B", !vehicleNames.includes("Vehicule Test B")) && ok;
  ok =
    check(
      "membership row shows accepted (trigger converted the pending invite)",
      members.some((m) => m.status === "accepted" && m.role === "member")
    ) && ok;

  await asTestUser.auth.signOut();
  await admin.auth.admin.deleteUser(created.user.id);
  console.log("\nCleaned up test user.");

  console.log(ok ? "\nALL CHECKS PASSED" : "\nSOME CHECKS FAILED");
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
