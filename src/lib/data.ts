import { supabase } from "@/lib/supabase";

export type Vehicle = { id: number; name: string; group_id: number; hidden: boolean };
export type Station = { id: number; name: string; group_id: number; hidden: boolean };

// A vehicle/station can be hidden itself, or belong to a group the current
// user has personally hidden — either way it should drop out of pickers.
// `hiddenGroupIds` comes from getMyGroups() (each group's hidden flag is
// per-viewer, so it can't be embedded directly in the vehicles/stations
// query the way a shared column could).
export function isEffectivelyHidden(
  item: { hidden: boolean; group_id: number },
  hiddenGroupIds: Set<number>
): boolean {
  return item.hidden || hiddenGroupIds.has(item.group_id);
}
export type Fill = {
  id: number;
  date: string;
  odometer: number;
  distance_unit: string;
  price_per_unit: number;
  volume: number;
  volume_unit: string;
  total_cost: number;
  currency: string;
  vehicles: { name: string } | null;
  stations: { name: string } | null;
};

export async function getVehicles(): Promise<Vehicle[]> {
  const { data, error } = await supabase.from("vehicles").select("id, name, group_id, hidden").order("name");
  if (error) throw error;
  return data;
}

export async function getStations(): Promise<Station[]> {
  const { data, error } = await supabase.from("stations").select("id, name, group_id, hidden").order("name");
  if (error) throw error;
  return data;
}

const FILL_COLUMNS =
  "id, date, odometer, distance_unit, price_per_unit, volume, volume_unit, total_cost, currency";

export async function getFills(): Promise<Fill[]> {
  const { data, error } = await supabase
    .from("fills")
    .select(`${FILL_COLUMNS}, vehicles(name), stations(name)`)
    .order("date", { ascending: false })
    .limit(5);
  if (error) throw error;
  return data as unknown as Fill[];
}

export type FullFill = Fill & { vehicle_id: number; station_id: number };

export async function getAllFills(): Promise<FullFill[]> {
  const { data, error } = await supabase
    .from("fills")
    .select(`${FILL_COLUMNS}, vehicle_id, station_id, vehicles(name), stations(name)`)
    .order("date", { ascending: false })
    .limit(2000);
  if (error) throw error;
  return data as unknown as FullFill[];
}

export type UsageEntry = { vehicle_id: number; station_id: number };

export async function getUsageStats(): Promise<UsageEntry[]> {
  const { data, error } = await supabase
    .from("fills")
    .select("vehicle_id, station_id")
    .order("date", { ascending: false })
    .limit(1000);
  if (error) throw error;
  return data;
}

// Most-used first, ties broken by most-recent use, then alphabetically.
// `usage` must already be sorted most-recent-first (as getUsageStats returns it).
export function rankByUsage<T extends { id: number; name: string }>(
  items: T[],
  usage: { id: number }[]
): T[] {
  const frequency = new Map<number, number>();
  const mostRecentIndex = new Map<number, number>();
  usage.forEach((u, index) => {
    frequency.set(u.id, (frequency.get(u.id) ?? 0) + 1);
    if (!mostRecentIndex.has(u.id)) mostRecentIndex.set(u.id, index);
  });

  return [...items].sort((a, b) => {
    const freqDiff = (frequency.get(b.id) ?? 0) - (frequency.get(a.id) ?? 0);
    if (freqDiff !== 0) return freqDiff;
    const recencyDiff = (mostRecentIndex.get(a.id) ?? Infinity) - (mostRecentIndex.get(b.id) ?? Infinity);
    if (recencyDiff !== 0) return recencyDiff;
    return a.name.localeCompare(b.name);
  });
}

export async function upsertVehicle(groupId: number, name: string): Promise<Vehicle> {
  const { data, error } = await supabase
    .from("vehicles")
    .upsert({ group_id: groupId, name }, { onConflict: "group_id,name" })
    .select("id, name, group_id, hidden")
    .single();
  if (error) throw error;
  return data;
}

export async function upsertStation(groupId: number, name: string): Promise<Station> {
  const { data, error } = await supabase
    .from("stations")
    .upsert({ group_id: groupId, name }, { onConflict: "group_id,name" })
    .select("id, name, group_id, hidden")
    .single();
  if (error) throw error;
  return data;
}

export async function addFill(fill: {
  vehicle_id: number;
  station_id: number;
  odometer: number;
  distance_unit: string;
  price_per_unit: number;
  volume: number;
  volume_unit: string;
  total_cost: number;
  currency: string;
}): Promise<void> {
  const { error } = await supabase.from("fills").insert(fill);
  if (error) throw error;
}

export async function updateFill(
  id: number,
  fill: {
    vehicle_id: number;
    station_id: number;
    odometer: number;
    distance_unit: string;
    price_per_unit: number;
    volume: number;
    volume_unit: string;
    total_cost: number;
    currency: string;
    date: string;
  }
): Promise<void> {
  const { error } = await supabase.from("fills").update(fill).eq("id", id);
  if (error) throw error;
}

export async function renameVehicle(id: number, name: string): Promise<void> {
  const { error } = await supabase.from("vehicles").update({ name }).eq("id", id);
  if (error) throw error;
}

export async function renameStation(id: number, name: string): Promise<void> {
  const { error } = await supabase.from("stations").update({ name }).eq("id", id);
  if (error) throw error;
}

// Postgres foreign_key_violation (23503): fills still reference this
// vehicle/station, so the delete is rejected rather than silently orphaning
// or cascading into someone's fill history.
export const FOREIGN_KEY_VIOLATION = "23503";

export async function deleteVehicle(id: number): Promise<void> {
  const { error } = await supabase.from("vehicles").delete().eq("id", id);
  if (error) throw error;
}

export async function deleteStation(id: number): Promise<void> {
  const { error } = await supabase.from("stations").delete().eq("id", id);
  if (error) throw error;
}

// Hidden vehicles/stations drop out of the "Nouveau plein" picker and the
// Historique filter chips, but their existing fills are untouched.
export async function setVehicleHidden(id: number, hidden: boolean): Promise<void> {
  const { error } = await supabase.from("vehicles").update({ hidden }).eq("id", id);
  if (error) throw error;
}

export async function setStationHidden(id: number, hidden: boolean): Promise<void> {
  const { error } = await supabase.from("stations").update({ hidden }).eq("id", id);
  if (error) throw error;
}

export type GroupMember = {
  id: number;
  email: string;
  role: "owner" | "member";
  status: "pending" | "accepted";
};

// "hidden" here is per-viewer (it lives on the membership row), so this
// goes through group_members rather than selecting groups directly.
// Hidden groups are still included: Paramètres needs to show them (grayed
// out) so they can be un-hidden later.
export async function getMyGroups(): Promise<{ id: number; name: string; hidden: boolean }[]> {
  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;

  const { data, error } = await supabase
    .from("group_members")
    .select("hidden, groups!inner(id, name)")
    .eq("user_id", userData.user.id)
    .eq("status", "accepted")
    .order("created_at");
  if (error) throw error;

  return (data as unknown as { hidden: boolean; groups: { id: number; name: string } }[]).map((row) => ({
    id: row.groups.id,
    name: row.groups.name,
    hidden: row.hidden,
  }));
}

// Updates the caller's own membership row (RLS + a column-level grant
// restrict this to the "hidden" column only, so a member can't use this
// endpoint to rewrite their own role).
export async function setGroupHidden(groupId: number, hidden: boolean): Promise<void> {
  const { error } = await supabase.from("group_members").update({ hidden }).eq("group_id", groupId);
  if (error) throw error;
}

export async function getGroupMembers(groupId: number): Promise<GroupMember[]> {
  const { data, error } = await supabase
    .from("group_members")
    .select("id, email, role, status")
    .eq("group_id", groupId)
    .order("role")
    .order("created_at");
  if (error) throw error;
  return data;
}

export async function inviteGroupMember(groupId: number, email: string): Promise<void> {
  const { error } = await supabase
    .from("group_members")
    .insert({ group_id: groupId, email, role: "member", status: "pending" });
  if (error) throw error;
}

export async function renameGroup(groupId: number, name: string): Promise<void> {
  const { error } = await supabase.from("groups").update({ name }).eq("id", groupId);
  if (error) throw error;
}

// Row Level Security restricts this to the caller's own membership row, and
// only when their role is "member" — an owner can't self-remove this way.
export async function leaveGroup(groupId: number): Promise<void> {
  const { error } = await supabase.from("group_members").delete().eq("group_id", groupId);
  if (error) throw error;
}

export async function createGroup(name: string): Promise<number> {
  const { data, error } = await supabase.rpc("create_group", { group_name: name });
  if (error) throw error;
  return data as number;
}

// Fails with FOREIGN_KEY_VIOLATION if the group still has vehicles/stations
// (delete those first — deliberately not cascaded, to avoid silently
// wiping fill history). If this was the caller's last owned group, a fresh
// empty one is created automatically so they always have somewhere to
// create new vehicles/stations and always retain invite rights somewhere.
export async function deleteGroup(groupId: number): Promise<void> {
  const { error } = await supabase.from("groups").delete().eq("id", groupId);
  if (error) throw error;

  const { data: owned, error: ownedErr } = await supabase
    .from("group_members")
    .select("id")
    .eq("role", "owner")
    .eq("status", "accepted")
    .limit(1);
  if (ownedErr) throw ownedErr;
  if (owned.length > 0) return;

  const { data: userData, error: userErr } = await supabase.auth.getUser();
  if (userErr) throw userErr;
  const displayName = userData.user?.user_metadata?.display_name as string | undefined;
  const emailName = userData.user?.email?.split("@")[0] ?? "Groupe";
  await createGroup(`Groupe de ${displayName || emailName}`);
}
