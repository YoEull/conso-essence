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
