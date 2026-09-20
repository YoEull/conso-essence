// Fuzzy name resolution shared by the MCP tools (Deno) and the Node tests,
// hence plain JS instead of TS.

export function normalize(s) {
  return String(s)
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

// -> { status: "found", item } | { status: "ambiguous", matches } | { status: "none" }
export function resolveByName(query, items) {
  const q = normalize(query);
  if (!q) return { status: "none" };

  const exact = items.filter((i) => normalize(i.name) === q);
  if (exact.length === 1) return { status: "found", item: exact[0] };
  if (exact.length > 1) return { status: "ambiguous", matches: exact };

  const partial = items.filter((i) => {
    const n = normalize(i.name);
    return n.includes(q) || q.includes(n);
  });
  if (partial.length === 1) return { status: "found", item: partial[0] };
  if (partial.length > 1) return { status: "ambiguous", matches: partial };
  return { status: "none" };
}
