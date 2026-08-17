// Dev-only regression test for delete-vehicle/delete-group behavior:
// FK-blocked deletes, and the "always own at least one group" invariant.
// Run with: node --env-file=.env.local scripts/test-group-lifecycle.mjs

import { createClient } from "@supabase/supabase-js";
import ws from "ws";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey || !serviceKey) {
  console.error("Missing env vars: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const TEST_EMAIL = "user_test_lifecycle@example.com";
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
  const createdGroupIds = [];

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

  const asUser = createClient(url, anonKey, { realtime: { transport: ws } });
  const { error: signInErr } = await asUser.auth.signInWithPassword({ email: TEST_EMAIL, password: TEST_PASSWORD });
  if (signInErr) throw signInErr;
  console.log("Signed in as lifecycle test user.\n");

  const { data: groupId, error: rpcErr } = await asUser.rpc("create_group", { group_name: "Groupe Test Lifecycle" });
  if (rpcErr) throw rpcErr;
  createdGroupIds.push(groupId);

  const { data: vehicle, error: vErr } = await asUser
    .from("vehicles")
    .insert({ group_id: groupId, name: "Vehicule Lifecycle" })
    .select("id")
    .single();
  if (vErr) throw vErr;

  const { error: blockedErr } = await asUser.from("groups").delete().eq("id", groupId);
  ok = check("delete blocked while group still has a vehicle", blockedErr?.code === "23503") && ok;

  const { error: delVehicleErr } = await asUser.from("vehicles").delete().eq("id", vehicle.id);
  ok = check("vehicle with no fills deletes cleanly", !delVehicleErr) && ok;

  const { error: delGroupErr } = await asUser.from("groups").delete().eq("id", groupId);
  ok = check("group delete succeeds once empty", !delGroupErr) && ok;

  const { data: owned, error: ownedErr } = await asUser
    .from("group_members")
    .select("id")
    .eq("role", "owner")
    .eq("status", "accepted");
  if (ownedErr) throw ownedErr;
  ok = check("owns zero groups right after deleting their only one", owned.length === 0) && ok;

  // This is the same check + RPC call deleteGroup() in data.ts performs.
  const { data: newGroupId, error: newGroupErr } = await asUser.rpc("create_group", {
    group_name: "Groupe de test_lifecycle",
  });
  if (newGroupErr) throw newGroupErr;
  createdGroupIds.push(newGroupId);

  const { data: ownedAfter, error: ownedAfterErr } = await asUser
    .from("group_members")
    .select("id")
    .eq("role", "owner")
    .eq("status", "accepted");
  if (ownedAfterErr) throw ownedAfterErr;
  ok = check("owns exactly one group again after auto-recreate", ownedAfter.length === 1) && ok;

  await asUser.auth.signOut();
  await admin.auth.admin.deleteUser(created.user.id);
  if (createdGroupIds.length) await admin.from("groups").delete().in("id", createdGroupIds);
  console.log("\nCleaned up.");

  console.log(ok ? "\nALL CHECKS PASSED" : "\nSOME CHECKS FAILED");
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
