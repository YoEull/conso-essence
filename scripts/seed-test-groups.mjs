// Dev-only test fixture, equivalent to supabase/dev-seed.sql but run
// through the REST API (data operations only — no schema changes needed
// here, so no SQL Editor round-trip required). Safe to re-run anytime.
// Run with: node --env-file=.env.local scripts/seed-test-groups.mjs

import { createClient } from "@supabase/supabase-js";
import ws from "ws";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey) {
  console.error("Missing env vars: NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const MY_USER_ID = "c138adb3-ca80-47e7-97eb-a6961074dd53";
const MY_EMAIL = "yoann.eulalie@gmail.com";
const TEST_GROUP_NAMES = ["Groupe Test A", "Groupe Test B", "Groupe Test (voisins)"];

const admin = createClient(url, serviceKey, { realtime: { transport: ws } });

async function main() {
  const { data: existing, error: existingErr } = await admin.from("groups").select("id").in("name", TEST_GROUP_NAMES);
  if (existingErr) throw existingErr;
  const staleIds = existing.map((g) => g.id);
  if (staleIds.length) {
    await admin.from("vehicles").delete().in("group_id", staleIds);
    await admin.from("stations").delete().in("group_id", staleIds);
    await admin.from("groups").delete().in("id", staleIds);
    console.log(`Cleaned up ${staleIds.length} stale test group(s).`);
  }

  const { data: groupA, error: aErr } = await admin.from("groups").insert({ name: "Groupe Test A" }).select("id").single();
  if (aErr) throw aErr;
  const { data: groupB, error: bErr } = await admin.from("groups").insert({ name: "Groupe Test B" }).select("id").single();
  if (bErr) throw bErr;

  const { error: membersErr } = await admin.from("group_members").insert([
    { group_id: groupA.id, user_id: MY_USER_ID, email: MY_EMAIL, role: "owner", status: "accepted" },
    { group_id: groupB.id, user_id: MY_USER_ID, email: MY_EMAIL, role: "member", status: "accepted" },
    { group_id: groupA.id, email: "user_test_b@example.com", role: "member", status: "pending" },
  ]);
  if (membersErr) throw membersErr;

  const { error: vehiclesErr } = await admin.from("vehicles").insert([
    { group_id: groupA.id, name: "Vehicule Test A" },
    { group_id: groupB.id, name: "Vehicule Test B" },
  ]);
  if (vehiclesErr) throw vehiclesErr;

  const { error: stationsErr } = await admin.from("stations").insert([
    { group_id: groupA.id, name: "Station Test A" },
    { group_id: groupB.id, name: "Station Test B" },
  ]);
  if (stationsErr) throw stationsErr;

  console.log(`Seeded Groupe Test A (${groupA.id}) and Groupe Test B (${groupB.id}).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
