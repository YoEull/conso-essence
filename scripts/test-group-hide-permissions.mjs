// Dev-only regression test: a member can flip their own group_members.hidden
// flag, but the same UPDATE endpoint must not let them rewrite their own
// role (privilege escalation via column-level grant, not just RLS).
// Run with: node --env-file=.env.local scripts/test-group-hide-permissions.mjs

import { createClient } from "@supabase/supabase-js";
import ws from "ws";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !anonKey || !serviceKey) {
  console.error("Missing env vars: NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const TEST_EMAIL = "user_test_hide_perms@example.com";
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

  const asUser = createClient(url, anonKey, { realtime: { transport: ws } });
  const { error: signInErr } = await asUser.auth.signInWithPassword({ email: TEST_EMAIL, password: TEST_PASSWORD });
  if (signInErr) throw signInErr;

  const { data: groupId, error: rpcErr } = await asUser.rpc("create_group", { group_name: "Groupe Test Perms" });
  if (rpcErr) throw rpcErr;

  const { error: hideErr } = await asUser.from("group_members").update({ hidden: true }).eq("group_id", groupId);
  ok = check("member can update their own 'hidden' flag", !hideErr) && ok;

  const { data: afterHide } = await asUser.from("group_members").select("hidden").eq("group_id", groupId).single();
  ok = check("hidden flag actually flipped to true", afterHide?.hidden === true) && ok;

  const { error: escalateErr } = await asUser
    .from("group_members")
    .update({ role: "owner", hidden: false })
    .eq("group_id", groupId);
  ok = check("column-level grant blocks touching 'role' via the same endpoint", !!escalateErr) && ok;
  if (escalateErr) console.log(`  (blocked with: ${escalateErr.message})`);

  await asUser.auth.signOut();
  await admin.auth.admin.deleteUser(created.user.id);
  await admin.from("groups").delete().eq("id", groupId);
  console.log("\nCleaned up.");

  console.log(ok ? "\nALL CHECKS PASSED" : "\nSOME CHECKS FAILED");
  process.exit(ok ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
