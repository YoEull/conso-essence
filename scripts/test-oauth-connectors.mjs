// End-to-end test of the connector lifecycle with a real OAuth flow (no
// browser): dynamic client registration -> authorize -> user approval ->
// token exchange -> call the MCP server with that OAuth token -> list and
// revoke the grant -> check the client can no longer refresh.
// Run: node --env-file=.env.local scripts/test-oauth-connectors.mjs

import { createClient } from "@supabase/supabase-js";
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js";
import { createHash, randomBytes } from "node:crypto";
import ws from "ws";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const MCP_URL = process.env.MCP_URL ?? `${url}/functions/v1/mcp`;
const EMAIL = "user_test_oauth@example.com";
const PASSWORD = "Test-Password-1234!";
const REDIRECT = "https://claude.ai/api/mcp/auth_callback";

const opts = { auth: { autoRefreshToken: false, persistSession: false }, realtime: { transport: ws } };
const admin = createClient(url, serviceKey, opts);

let ok = true;
const check = (label, cond, extra) => {
  console.log(`${cond ? "PASS" : "FAIL"} — ${label}`);
  if (!cond && extra) console.log(`  got: ${extra}`);
  ok = cond && ok;
};

async function main() {
  const { data: list } = await admin.auth.admin.listUsers();
  const prior = list.users.find((u) => u.email === EMAIL);
  if (prior) await admin.auth.admin.deleteUser(prior.id);
  const { data: created, error } = await admin.auth.admin.createUser({ email: EMAIL, password: PASSWORD, email_confirm: true });
  if (error) throw error;
  const user = createClient(url, anonKey, opts);
  await user.auth.signInWithPassword({ email: EMAIL, password: PASSWORD });

  let clientId;
  try {
    const meta = await (await fetch(`${url}/.well-known/oauth-authorization-server/auth/v1`)).json();

    const reg = await fetch(meta.registration_endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        client_name: "Test Connector",
        redirect_uris: [REDIRECT],
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        token_endpoint_auth_method: "none",
      }),
    });
    const client = await reg.json();
    clientId = client.client_id;
    check("dynamic client registration works", reg.ok && !!clientId, JSON.stringify(client));

    const verifier = randomBytes(32).toString("base64url");
    const challenge = createHash("sha256").update(verifier).digest("base64url");
    const authz = new URL(meta.authorization_endpoint);
    Object.entries({
      response_type: "code", client_id: clientId, redirect_uri: REDIRECT, state: "xyz",
      code_challenge: challenge, code_challenge_method: "S256", scope: "openid email",
    }).forEach(([k, v]) => authz.searchParams.set(k, v));
    const authRes = await fetch(authz, { redirect: "manual" });
    const location = authRes.headers.get("location") ?? "";
    const authorizationId = new URL(location, "http://x").searchParams.get("authorization_id");
    check("authorize redirects to the consent page with an authorization_id", !!authorizationId && location.includes("/oauth/consent"), location);

    const details = await user.auth.oauth.getAuthorizationDetails(authorizationId);
    check("consent details expose client name and redirect_uri", details.data?.client?.name === "Test Connector" && details.data?.redirect_uri === REDIRECT, JSON.stringify(details));

    const approved = await user.auth.oauth.approveAuthorization(authorizationId);
    const code = new URL(approved.data?.redirect_url ?? "http://x").searchParams.get("code");
    check("approval returns a code on the client's redirect", !!code && approved.data.redirect_url.startsWith(REDIRECT), JSON.stringify(approved));

    const tokenRes = await fetch(meta.token_endpoint, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "authorization_code", code, redirect_uri: REDIRECT, client_id: clientId, code_verifier: verifier }),
    });
    const tokens = await tokenRes.json();
    check("code exchanged for access + refresh tokens (PKCE)", tokenRes.ok && !!tokens.access_token && !!tokens.refresh_token, JSON.stringify(tokens));

    const mcp = new Client({ name: "oauth-test", version: "1.0.0" });
    await mcp.connect(new StreamableHTTPClientTransport(new URL(MCP_URL), { requestInit: { headers: { Authorization: `Bearer ${tokens.access_token}` } } }));
    const tools = await mcp.listTools();
    check("MCP server accepts the OAuth access token", tools.tools.length >= 5, String(tools.tools?.length));
    await mcp.close();

    const grants = await user.auth.oauth.listGrants();
    check("grant is listed for the user", grants.data?.some((g) => g.client.id === clientId && g.client.name === "Test Connector"), JSON.stringify(grants));

    const revoked = await user.auth.oauth.revokeGrant({ clientId });
    check("revokeGrant succeeds", !revoked.error, JSON.stringify(revoked.error));
    const after = await user.auth.oauth.listGrants();
    check("grant no longer listed", !after.data?.some((g) => g.client.id === clientId), JSON.stringify(after));

    const refresh = await fetch(meta.token_endpoint, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: tokens.refresh_token, client_id: clientId }),
    });
    check("revoked client can no longer refresh its token", !refresh.ok, `${refresh.status}`);

    const stale = await fetch(MCP_URL, { method: "POST", headers: { Authorization: `Bearer ${tokens.access_token}`, "content-type": "application/json", accept: "application/json, text/event-stream" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }) });
    check("old access token is rejected right after revocation", stale.status === 401, `${stale.status}`);
  } finally {
    if (clientId) await admin.auth.admin.oauth.deleteClient(clientId);
    await admin.auth.admin.deleteUser(created.user.id);
    console.log("\nCleaned up.");
  }
  console.log(ok ? "\nALL CHECKS PASSED" : "\nSOME CHECKS FAILED");
  process.exit(ok ? 0 : 1);
}

main().catch((e) => { console.error(e); process.exit(1); });
