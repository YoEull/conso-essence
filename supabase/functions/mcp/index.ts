// MCP server for Suivi Essence, hosted as a Supabase Edge Function.
//
// It is an OAuth 2.1 *resource server*: Supabase Auth (its OAuth Server
// feature) issues the tokens, we only verify them and then talk to Postgres
// with that same token, so the existing RLS policies decide what the caller
// can see or write. No service-role key is used here on purpose.
import { McpServer, StreamableHttpTransport } from "mcp-lite";
import { z } from "zod";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { createRemoteJWKSet, type JWTPayload, jwtVerify } from "jose";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { resolveByName } from "./match.mjs";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const ISSUER = `${SUPABASE_URL}/auth/v1`;
const RESOURCE = `${SUPABASE_URL}/functions/v1/mcp`;
const METADATA_URL = `${RESOURCE}/.well-known/oauth-protected-resource`;
const jwks = createRemoteJWKSet(new URL(`${ISSUER}/.well-known/jwks.json`));

const CURRENCIES = ["EUR", "USD", "GBP", "JPY", "CNY", "CAD", "INR", "KRW", "CHF", "AUD"] as const;

type Item = { id: number; name: string; group_id: number };
type Reply = { content: { type: "text"; text: string }[]; isError?: boolean };

const ok = (text: string): Reply => ({ content: [{ type: "text", text }] });
const fail = (text: string): Reply => ({ content: [{ type: "text", text }], isError: true });
const names = (items: { name: string }[]) => items.map((i) => i.name).join(", ") || "(none)";

async function visibleItems(sb: SupabaseClient, table: "vehicles" | "stations"): Promise<Item[]> {
  const { data, error } = await sb.from(table).select("id, name, group_id").eq("hidden", false).order("name");
  if (error) throw error;
  return data as Item[];
}

// Picks a vehicle/station by free text, or explains to the LLM what to ask
// the user next. Returns either the item or a ready-made error reply.
function pick(kind: "vehicle" | "station", query: string, items: Item[]): Item | Reply {
  const r = resolveByName(query, items);
  if (r.status === "found") return r.item;
  if (r.status === "ambiguous") {
    return fail(`Several ${kind}s match "${query}": ${names(r.matches)}. Ask the user which one they mean.`);
  }
  return fail(`No ${kind} matches "${query}". Existing ${kind}s: ${names(items)}. Ask the user which one they mean.`);
}

// "to" is exclusive in SQL, so a date-only "to" (2026-03-31) means "through
// the end of that day". Returns null for unparsable input.
function bound(value: string | undefined, isEnd: boolean): string | null | undefined {
  if (!value) return undefined;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  if (isEnd && /^\d{4}-\d{2}-\d{2}$/.test(value)) d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString();
}

const DATE_HELP = "ISO date, e.g. 2026-01-31.";

// Failed tool calls (handler errors and schema-validation rejections) are
// stored so we can see where LLMs struggle. Never lets logging break a call.
function logFailures(mcp: McpServer, sb: SupabaseClient, userId: string, clientId: string | null) {
  // deno-lint-ignore no-explicit-any
  const record = async (req: any, error: string) => {
    try {
      if (req?.method !== "tools/call") return;
      const args = JSON.stringify(req.params?.arguments ?? {});
      await sb.from("mcp_calls").insert({
        user_id: userId,
        client_id: clientId,
        tool: String(req.params?.name ?? "?"),
        arguments: args.length > 4000 ? { truncated: true } : JSON.parse(args),
        error: error.slice(0, 1000),
      });
    } catch (e) {
      console.error("mcp_calls log failed", e);
    }
  };

  // Schema-validation failures throw before the handler runs, so they surface here.
  mcp.onError(async (err, ctx) => {
    ctx.state.logged = true;
    await record(ctx.request, err instanceof Error ? err.message : String(err));
    return undefined;
  });

  // Errors returned by our own handlers (isError results).
  mcp.use(async (ctx, next) => {
    await next();
    if (ctx.state.logged) return;
    // deno-lint-ignore no-explicit-any
    const res = ctx.response as any;
    const error = res?.error
      ? `${res.error.code}: ${res.error.message} ${JSON.stringify(res.error.data ?? "")}`
      : res?.result?.isError
      ? String(res.result.content?.[0]?.text ?? "error")
      : null;
    if (error) await record(ctx.request, error);
  });
}

function buildServer(sb: SupabaseClient, userId: string, clientId: string | null): McpServer {
  const mcp = new McpServer({
    name: "suivi-essence",
    version: "1.0.0",
    schemaAdapter: (schema) => z.toJSONSchema(schema as z.ZodType),
  });
  logFailures(mcp, sb, userId, clientId);

  mcp.tool("list_vehicles", {
    description: "List the user's vehicles (across all their groups). Use it to check which vehicles exist.",
    inputSchema: z.object({}),
    handler: async (): Promise<Reply> => ok(names(await visibleItems(sb, "vehicles"))),
  });

  mcp.tool("list_stations", {
    description: "List the user's fuel stations (across all their groups).",
    inputSchema: z.object({}),
    handler: async (): Promise<Reply> => ok(names(await visibleItems(sb, "stations"))),
  });

  mcp.tool("get_recent_fills", {
    description:
      "List individual fill-ups, newest first, optionally for one vehicle and/or a date range. " +
      "Useful to recall the last odometer reading or to inspect specific fills. " +
      "For totals, averages or consumption use get_stats instead of computing by hand.",
    inputSchema: z.object({
      vehicle: z.string().optional().describe("Vehicle name (partial match allowed). Omit for all vehicles."),
      from: z.string().optional().describe(`Only fills on or after this date. ${DATE_HELP}`),
      to: z.string().optional().describe(`Only fills up to and including this date. ${DATE_HELP}`),
      limit: z.number().int().min(1).max(100).optional().describe("How many fills to return (default 5, max 100)."),
    }),
    handler: async ({ vehicle, from, to, limit }: { vehicle?: string; from?: string; to?: string; limit?: number }): Promise<Reply> => {
      const gte = bound(from, false);
      const lt = bound(to, true);
      if (gte === null || lt === null) return fail("Invalid date. Use ISO format, e.g. 2026-01-31.");
      let query = sb
        .from("fills")
        .select("date, odometer, distance_unit, price_per_unit, volume, volume_unit, total_cost, currency, vehicles(name), stations(name)")
        .order("date", { ascending: false })
        .limit(limit ?? 5);
      if (gte) query = query.gte("date", gte);
      if (lt) query = query.lt("date", lt);
      if (vehicle) {
        const v = pick("vehicle", vehicle, await visibleItems(sb, "vehicles"));
        if ("content" in v) return v;
        query = query.eq("vehicle_id", v.id);
      }
      const { data, error } = await query;
      if (error) return fail(error.message);
      if (!data.length) return ok("No fill-ups found for this selection.");
      // deno-lint-ignore no-explicit-any
      return ok((data as any[]).map((f) =>
        `${f.date.slice(0, 10)} | ${f.vehicles?.name} @ ${f.stations?.name} | ${f.odometer} ${f.distance_unit} | ` +
        `${f.volume} ${f.volume_unit} at ${f.price_per_unit}/${f.volume_unit} = ${f.total_cost} ${f.currency}`
      ).join("\n"));
    },
  });

  mcp.tool("get_stats", {
    description:
      "Exact statistics computed by the database, per vehicle: number of fills, total cost, total volume, " +
      "average price per unit, distance driven and consumption per 100 distance units. " +
      "Optionally restricted to a vehicle and/or a date range (e.g. a month or a year). " +
      "Consumption assumes every fill is a full tank, so present it as approximate.",
    inputSchema: z.object({
      vehicle: z.string().optional().describe("Vehicle name (partial match allowed). Omit for all vehicles."),
      from: z.string().optional().describe(`Start of the period, inclusive. ${DATE_HELP}`),
      to: z.string().optional().describe(`End of the period, inclusive. ${DATE_HELP}`),
    }),
    handler: async ({ vehicle, from, to }: { vehicle?: string; from?: string; to?: string }): Promise<Reply> => {
      const p_from = bound(from, false);
      const p_to = bound(to, true);
      if (p_from === null || p_to === null) return fail("Invalid date. Use ISO format, e.g. 2026-01-31.");
      let vehicleId: number | undefined;
      if (vehicle) {
        const v = pick("vehicle", vehicle, await visibleItems(sb, "vehicles"));
        if ("content" in v) return v;
        vehicleId = v.id;
      }
      const { data, error } = await sb.rpc("fuel_stats", {
        p_from: p_from ?? null, p_to: p_to ?? null, p_vehicle_id: vehicleId ?? null,
      });
      if (error) return fail(error.message);
      if (!data.length) return ok("No fill-ups found for this selection.");
      // deno-lint-ignore no-explicit-any
      return ok((data as any[]).map((r) =>
        `${r.vehicle} (${r.currency}): ${r.fills_count} fills, ${r.total_cost} ${r.currency} total, ` +
        `${r.total_volume} ${r.volume_unit}, avg ${r.avg_price_per_unit}/${r.volume_unit}, ` +
        `distance ${r.total_distance ?? "n/a"} ${r.distance_unit}, ` +
        `consumption ${r.consumption_per_100 ?? "n/a"} ${r.volume_unit}/100 ${r.distance_unit} (approx.), ` +
        `${r.first_fill.slice(0, 10)} to ${r.last_fill.slice(0, 10)}`
      ).join("\n"));
    },
  });

  mcp.tool("create_fill", {
    description:
      "Record a fuel fill-up. All of vehicle, station, price_per_unit, volume and odometer are REQUIRED: " +
      "if the user did not give one of them, ask them before calling this tool, never guess. " +
      "vehicle and station are matched by name; if the reply says a name is unknown or ambiguous, relay the options to the user.",
    inputSchema: z.object({
      vehicle: z.string().describe("Vehicle name as the user said it, e.g. 'Clio'."),
      station: z.string().describe("Station name as the user said it, e.g. 'Station U'."),
      price_per_unit: z.number().positive().describe("Price per litre (or per gallon), in the fill's currency."),
      volume: z.number().positive().describe("Quantity of fuel, in litres by default."),
      odometer: z.number().min(0).describe("Odometer reading, in km by default."),
      date: z.string().optional().describe("ISO 8601 date/time of the fill. Omit for now."),
      currency: z.enum(CURRENCIES).optional().describe("Defaults to the vehicle's last fill, else EUR."),
      volume_unit: z.enum(["L", "gal_us", "gal_uk"]).optional().describe("Defaults to the vehicle's last fill, else L."),
      distance_unit: z.enum(["km", "mi"]).optional().describe("Defaults to the vehicle's last fill, else km."),
      create_station_if_missing: z.boolean().optional()
        .describe("Only set true after the user confirmed the station is new; it is then created in the vehicle's group."),
    }),
    handler: async (a: {
      vehicle: string; station: string; price_per_unit: number; volume: number; odometer: number;
      date?: string; currency?: (typeof CURRENCIES)[number]; volume_unit?: "L" | "gal_us" | "gal_uk";
      distance_unit?: "km" | "mi"; create_station_if_missing?: boolean;
    }): Promise<Reply> => {
      const v = pick("vehicle", a.vehicle, await visibleItems(sb, "vehicles"));
      if ("content" in v) return v;

      const stations = await visibleItems(sb, "stations");
      let s: Item;
      const found = resolveByName(a.station, stations);
      if (found.status === "found") {
        s = found.item;
      } else if (found.status === "ambiguous") {
        return fail(`Several stations match "${a.station}": ${names(found.matches)}. Ask the user which one they mean.`);
      } else if (a.create_station_if_missing) {
        const { data, error } = await sb.from("stations")
          .insert({ group_id: v.group_id, name: a.station.trim() }).select("id, name, group_id").single();
        if (error) return fail(error.message);
        s = data as Item;
      } else {
        return fail(
          `No station matches "${a.station}". Existing stations: ${names(stations)}. ` +
          `Ask the user which one they mean, or whether "${a.station}" is a new station (then call again with create_station_if_missing=true).`,
        );
      }

      const { data: last } = await sb.from("fills")
        .select("odometer, currency, volume_unit, distance_unit")
        .eq("vehicle_id", v.id).order("date", { ascending: false }).limit(1).maybeSingle();

      const row = {
        vehicle_id: v.id,
        station_id: s.id,
        odometer: a.odometer,
        distance_unit: a.distance_unit ?? last?.distance_unit ?? "km",
        price_per_unit: a.price_per_unit,
        volume: a.volume,
        volume_unit: a.volume_unit ?? last?.volume_unit ?? "L",
        total_cost: Math.round(a.price_per_unit * a.volume * 100) / 100,
        currency: a.currency ?? last?.currency ?? "EUR",
        ...(a.date ? { date: a.date } : {}),
      };
      const { error } = await sb.from("fills").insert(row);
      if (error) return fail(error.message);

      let msg = `Saved: ${v.name} @ ${s.name}, ${row.volume} ${row.volume_unit} at ${row.price_per_unit}, ` +
        `total ${row.total_cost} ${row.currency}, odometer ${row.odometer} ${row.distance_unit}.`;
      if (last && a.odometer < Number(last.odometer)) {
        msg += ` Warning: this odometer is lower than the previous fill (${last.odometer}); tell the user in case of a typo.`;
      }
      return ok(msg);
    },
  });

  return mcp;
}

const app = new Hono().basePath("/mcp");
app.use("*", cors({ origin: "*", exposeHeaders: ["WWW-Authenticate"] }));

// RFC 9728: tells MCP clients which authorization server to use.
app.get("/.well-known/oauth-protected-resource", (c) =>
  c.json({ resource: RESOURCE, authorization_servers: [ISSUER], bearer_methods_supported: ["header"] }));

const unauthorized = () =>
  new Response(JSON.stringify({ error: "unauthorized" }), {
    status: 401,
    headers: { "Content-Type": "application/json", "WWW-Authenticate": `Bearer resource_metadata="${METADATA_URL}"` },
  });

const handleMcp = async (req: Request): Promise<Response> => {
  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  if (!token) return unauthorized();
  let payload: JWTPayload;
  try {
    ({ payload } = await jwtVerify(token, jwks, { issuer: ISSUER }));
  } catch {
    return unauthorized();
  }
  const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
  // The JWT signature stays valid until expiry even after the user revokes the
  // connector; asking Auth confirms the underlying session still exists.
  const { error: sessionError } = await sb.auth.getUser(token);
  if (sessionError) return unauthorized();
  return new StreamableHttpTransport().bind(buildServer(sb, String(payload.sub), (payload.client_id as string | undefined) ?? null))(req);
};

app.all("/", (c) => handleMcp(c.req.raw));
app.all("/mcp", (c) => handleMcp(c.req.raw));

Deno.serve(app.fetch);
