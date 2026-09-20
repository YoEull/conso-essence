// Unit test for the MCP name matcher. Run: node scripts/test-match.mjs
import { resolveByName } from "../supabase/functions/mcp/match.mjs";

let ok = true;
const check = (label, cond) => { console.log(`${cond ? "PASS" : "FAIL"} — ${label}`); ok = cond && ok; };

const stations = [{ id: 1, name: "Station U" }, { id: 2, name: "Leclerc" }, { id: 3, name: "Total Access" }, { id: 4, name: "Total Energies" }];

check("exact, case/accents ignored", resolveByName("leclerc", stations).item?.id === 2);
check("partial: 'u' alone is ambiguous-free only if unique", resolveByName("station u", stations).item?.id === 1);
check("query contained in name", resolveByName("access", stations).item?.id === 3);
check("ambiguous prefix", resolveByName("total", stations).status === "ambiguous");
check("unknown", resolveByName("Shell", stations).status === "none");
check("empty", resolveByName("  ", stations).status === "none");
check("accents", resolveByName("Élec", [{ id: 9, name: "Elec" }]).item?.id === 9);

process.exit(ok ? 0 : 1);
