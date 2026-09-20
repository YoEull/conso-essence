// Contract test for the MCP server, using the official MCP client like a real
// LLM host would. Auth is a normal test-user session token: the server only
// checks "valid Supabase JWT", however it was obtained.
// Run: node --env-file=.env.local scripts/test-mcp.mjs
// Target: MCP_URL (default: local Deno container on 127.0.0.1:8787).

import { createClient } from "@supabase/supabase-js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import ws from "ws";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MCP_URL = process.env.MCP_URL ?? "http://127.0.0.1:8787/mcp";
const PASSWORD = "Test-Password-1234!";
const EMAIL_A = "user_test_mcp_a@example.com";
const EMAIL_B = "user_test_mcp_b@example.com";

const opts = { auth: { autoRefreshToken: false, persistSession: false }, realtime: { transport: ws } };
const admin = createClient(url, serviceKey, opts);

let ok = true;
const check = (label, cond, extra) => {
  console.log(`${cond ? "PASS" : "FAIL"} — ${label}`);
  if (!cond && extra) console.log(`  got: ${extra}`);
  ok = cond && ok;
};
const text = (r) => r.content?.map((c) => c.text).join("\n") ?? "";

async function makeUser(email) {
  const { data: list } = await admin.auth.admin.listUsers();
  const prior = list.users.find((u) => u.email === email);
  if (prior) await admin.auth.admin.deleteUser(prior.id);
  const { data: created, error } = await admin.auth.admin.createUser({ email, password: PASSWORD, email_confirm: true });
  if (error) throw error;
  const sb = createClient(url, anonKey, opts);
  const { data: s, error: e2 } = await sb.auth.signInWithPassword({ email, password: PASSWORD });
  if (e2) throw e2;
  return { id: created.user.id, sb, token: s.session.access_token };
}

async function mcpClient(token) {
  const client = new Client({ name: "test", version: "1.0.0" });
  await client.connect(new StreamableHTTPClientTransport(new URL(MCP_URL), {
    requestInit: { headers: { Authorization: `Bearer ${token}` } },
  }));
  return client;
}

async function main() {
  const A = await makeUser(EMAIL_A);
  const B = await makeUser(EMAIL_B);
  const groupIds = [];

  // A: 1 vehicle + 2 stations. B: its own vehicle, invisible to A.
  const { data: gA } = await A.sb.rpc("create_group", { group_name: "Groupe MCP Test A" });
  const { data: gB } = await B.sb.rpc("create_group", { group_name: "Groupe MCP Test B" });
  groupIds.push(gA, gB);
  await A.sb.from("vehicles").insert({ group_id: gA, name: "Clio Test" });
  await A.sb.from("stations").insert([{ group_id: gA, name: "Station U Test" }, { group_id: gA, name: "Leclerc Test" }]);
  await B.sb.from("vehicles").insert({ group_id: gB, name: "Zoe Test" });

  try {
    const noAuth = await fetch(MCP_URL, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" });
    check("no token -> 401", noAuth.status === 401);
    check("401 carries resource_metadata pointer", /resource_metadata=/.test(noAuth.headers.get("www-authenticate") ?? ""));
    const bad = await fetch(MCP_URL, { method: "POST", headers: { Authorization: "Bearer not.a.jwt", "content-type": "application/json" }, body: "{}" });
    check("garbage token -> 401", bad.status === 401);

    const client = await mcpClient(A.token);
    const { tools } = await client.listTools();
    const toolNames = tools.map((t) => t.name).sort();
    check("exposes the 4 tools", JSON.stringify(toolNames) === JSON.stringify(["create_fill", "get_recent_fills", "list_stations", "list_vehicles"]), toolNames.join());
    const req = tools.find((t) => t.name === "create_fill")?.inputSchema.required ?? [];
    check("create_fill requires vehicle, station, price_per_unit, volume, odometer",
      ["vehicle", "station", "price_per_unit", "volume", "odometer"].every((k) => req.includes(k)), req.join());

    const vehicles = text(await client.callTool({ name: "list_vehicles", arguments: {} }));
    check("A sees own vehicle", vehicles.includes("Clio Test"), vehicles);
    check("A does not see B's vehicle (RLS)", !vehicles.includes("Zoe Test"), vehicles);

    const base = { station: "station u test", price_per_unit: 1.987, volume: 45, odometer: 56987 };

    const missing = await client.callTool({ name: "create_fill", arguments: { vehicle: "Clio", station: "u", price_per_unit: 1.9, volume: 40 } }).catch((e) => ({ isError: true, content: [{ text: String(e) }] }));
    check("missing odometer is rejected", missing.isError === true, text(missing));

    const unknownV = await client.callTool({ name: "create_fill", arguments: { ...base, vehicle: "Peugeot" } });
    check("unknown vehicle -> error listing existing ones", unknownV.isError && text(unknownV).includes("Clio Test"), text(unknownV));

    const otherV = await client.callTool({ name: "create_fill", arguments: { ...base, vehicle: "Zoe" } });
    check("cannot log on another user's vehicle", otherV.isError === true, text(otherV));

    const unknownS = await client.callTool({ name: "create_fill", arguments: { ...base, vehicle: "clio", station: "Shell" } });
    check("unknown station -> asks, mentions create_station_if_missing", unknownS.isError && text(unknownS).includes("create_station_if_missing"), text(unknownS));

    const good = await client.callTool({ name: "create_fill", arguments: { ...base, vehicle: "clio" } });
    check("valid fill saved", !good.isError && text(good).startsWith("Saved"), text(good));
    const { data: rows } = await admin.from("fills").select("total_cost, currency, volume_unit, distance_unit, odometer").eq("odometer", 56987);
    check("row stored with computed total and default units", rows?.length === 1 && Math.abs(rows[0].total_cost - 89.42) < 0.011 && rows[0].currency === "EUR" && rows[0].volume_unit === "L" && rows[0].distance_unit === "km", JSON.stringify(rows));

    const lower = await client.callTool({ name: "create_fill", arguments: { ...base, vehicle: "clio", odometer: 50000 } });
    check("lower odometer saved with a warning", !lower.isError && /Warning/.test(text(lower)), text(lower));

    const created = await client.callTool({ name: "create_fill", arguments: { ...base, vehicle: "clio", station: "Carrefour Test", odometer: 57500, create_station_if_missing: true } });
    check("new station created on confirmation", !created.isError && text(created).includes("Carrefour Test"), text(created));
    const { data: st } = await admin.from("stations").select("group_id").eq("name", "Carrefour Test");
    check("new station inherits the vehicle's group", st?.length === 1 && st[0].group_id === gA, JSON.stringify(st));

    const recent = text(await client.callTool({ name: "get_recent_fills", arguments: { vehicle: "Clio", limit: 3 } }));
    check("get_recent_fills lists fills", recent.split("\n").length === 3 && recent.includes("Clio Test"), recent);
    await client.close();

    const clientB = await mcpClient(B.token);
    const vB = text(await clientB.callTool({ name: "list_vehicles", arguments: {} }));
    check("B sees only own vehicle", vB.includes("Zoe Test") && !vB.includes("Clio Test"), vB);
    await clientB.close();
  } finally {
    for (const g of groupIds) {
      const { data: vs } = await admin.from("vehicles").select("id").eq("group_id", g);
      const ids = (vs ?? []).map((v) => v.id);
      if (ids.length) await admin.from("fills").delete().in("vehicle_id", ids);
      await admin.from("vehicles").delete().eq("group_id", g);
      await admin.from("stations").delete().eq("group_id", g);
      await admin.from("group_members").delete().eq("group_id", g);
      await admin.from("groups").delete().eq("id", g);
    }
    await admin.auth.admin.deleteUser(A.id);
    await admin.auth.admin.deleteUser(B.id);
    console.log("\nCleaned up.");
  }
  console.log(ok ? "\nALL CHECKS PASSED" : "\nSOME CHECKS FAILED");
  process.exit(ok ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
