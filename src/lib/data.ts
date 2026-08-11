import { supabase } from "@/lib/supabase";

export type Vehicle = { id: number; name: string };
export type Station = { id: number; name: string };
export type Fill = {
  id: number;
  date: string;
  mileage: number;
  price_per_liter: number;
  liters: number;
  total_cost: number;
  vehicles: { name: string } | null;
  stations: { name: string } | null;
};

export async function getVehicles(): Promise<Vehicle[]> {
  const { data, error } = await supabase.from("vehicles").select("id, name").order("name");
  if (error) throw error;
  return data;
}

export async function getStations(): Promise<Station[]> {
  const { data, error } = await supabase.from("stations").select("id, name").order("name");
  if (error) throw error;
  return data;
}

export async function getFills(): Promise<Fill[]> {
  const { data, error } = await supabase
    .from("fills")
    .select("id, date, mileage, price_per_liter, liters, total_cost, vehicles(name), stations(name)")
    .order("date", { ascending: false })
    .limit(5);
  if (error) throw error;
  return data as unknown as Fill[];
}

export type FullFill = Fill & { vehicle_id: number; station_id: number };

export async function getAllFills(): Promise<FullFill[]> {
  const { data, error } = await supabase
    .from("fills")
    .select(
      "id, date, mileage, price_per_liter, liters, total_cost, vehicle_id, station_id, vehicles(name), stations(name)"
    )
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

export async function upsertVehicle(name: string): Promise<Vehicle> {
  const { data, error } = await supabase
    .from("vehicles")
    .upsert({ name }, { onConflict: "name" })
    .select("id, name")
    .single();
  if (error) throw error;
  return data;
}

export async function upsertStation(name: string): Promise<Station> {
  const { data, error } = await supabase
    .from("stations")
    .upsert({ name }, { onConflict: "name" })
    .select("id, name")
    .single();
  if (error) throw error;
  return data;
}

export async function addFill(fill: {
  vehicle_id: number;
  station_id: number;
  mileage: number;
  price_per_liter: number;
  liters: number;
  total_cost: number;
}): Promise<void> {
  const { error } = await supabase.from("fills").insert(fill);
  if (error) throw error;
}

export async function updateFill(
  id: number,
  fill: {
    vehicle_id: number;
    station_id: number;
    mileage: number;
    price_per_liter: number;
    liters: number;
    total_cost: number;
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
