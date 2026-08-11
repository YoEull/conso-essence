"use client";

import { useEffect, useState } from "react";
import {
  Vehicle,
  Station,
  Fill,
  getVehicles,
  getStations,
  getFills,
  getUsageStats,
  rankByUsage,
  upsertVehicle,
  upsertStation,
  addFill,
} from "@/lib/data";
import { ChipPicker } from "@/components/ChipPicker";
import { AppHeader } from "@/components/AppHeader";

export default function Home() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [fills, setFills] = useState<Fill[]>([]);
  const [loading, setLoading] = useState(false);

  const [selectedVehicleId, setSelectedVehicleId] = useState<number | "">("");
  const [mileage, setMileage] = useState("");
  const [pricePerLiter, setPricePerLiter] = useState("");
  const [liters, setLiters] = useState("");
  const [selectedStationId, setSelectedStationId] = useState<number | "">("");
  const [findingStation, setFindingStation] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [v, s, f, usage] = await Promise.all([
        getVehicles(),
        getStations(),
        getFills(),
        getUsageStats(),
      ]);
      setVehicles(rankByUsage(v, usage.map((u) => ({ id: u.vehicle_id }))));
      setStations(rankByUsage(s, usage.map((u) => ({ id: u.station_id }))));
      setFills(f);
    } catch (e) {
      alert("Erreur de chargement : " + (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const lastVehicleId = localStorage.getItem("lastVehicleId");
    if (lastVehicleId) setSelectedVehicleId(Number(lastVehicleId));
  }, []);

  const selectVehicle = (id: number) => {
    setSelectedVehicleId(id);
    localStorage.setItem("lastVehicleId", String(id));
  };

  const addVehicle = async (name: string) => {
    const vehicle = await upsertVehicle(name);
    setVehicles((prev) => (prev.some((v) => v.id === vehicle.id) ? prev : [vehicle, ...prev]));
    selectVehicle(vehicle.id);
  };

  const selectStation = (id: number) => setSelectedStationId(id);

  const addStation = async (name: string) => {
    const station = await upsertStation(name);
    setStations((prev) => (prev.some((s) => s.id === station.id) ? prev : [station, ...prev]));
    selectStation(station.id);
  };

  const findNearestStation = async () => {
    setFindingStation(true);
    try {
      const position = await new Promise<GeolocationPosition>((resolve, reject) => {
        navigator.geolocation.getCurrentPosition(resolve, reject);
      });
      const { latitude, longitude } = position.coords;
      await addStation(`Station (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`);
    } catch {
      alert("Impossible d'obtenir votre position.");
    } finally {
      setFindingStation(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedVehicleId || !mileage || !pricePerLiter || !liters || !selectedStationId) {
      alert("Veuillez remplir tous les champs");
      return;
    }

    setLoading(true);
    try {
      await addFill({
        vehicle_id: Number(selectedVehicleId),
        station_id: Number(selectedStationId),
        mileage: parseFloat(mileage),
        price_per_liter: parseFloat(pricePerLiter),
        liters: parseFloat(liters),
        total_cost: Number((parseFloat(pricePerLiter) * parseFloat(liters)).toFixed(2)),
      });

      setMileage("");
      setPricePerLiter("");
      setLiters("");
      setSelectedStationId("");

      await loadData();
    } catch (e) {
      alert("Erreur : " + (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const totalCost =
    pricePerLiter && liters ? (parseFloat(pricePerLiter) * parseFloat(liters)).toFixed(2) : null;

  return (
    <div className="min-h-dvh bg-gray-50 flex flex-col">
      <AppHeader
        title="Suivi Essence"
        rightAction={
          <button onClick={loadData} disabled={loading} className="p-2 rounded-lg text-gray-500 active:bg-gray-100">
            <span className={loading ? "inline-block animate-spin" : ""}>↻</span>
          </button>
        }
      />

      <main className="flex-1 overflow-y-auto px-4 py-5 space-y-6 pb-40">
        <ChipPicker
          label="Véhicule"
          items={vehicles}
          selectedId={selectedVehicleId}
          onSelect={selectVehicle}
          onAddNew={addVehicle}
        />

        <ChipPicker
          label="Station"
          items={stations}
          selectedId={selectedStationId}
          onSelect={selectStation}
          onAddNew={addStation}
          extraAction={{ icon: "📍", onClick: findNearestStation, loading: findingStation }}
        />

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-2">Prix / L (€)</label>
            <input
              type="number"
              inputMode="decimal"
              step="0.001"
              value={pricePerLiter}
              onChange={(e) => setPricePerLiter(e.target.value)}
              placeholder="Ex: 1.65"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-lg"
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-2">Litres</label>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              value={liters}
              onChange={(e) => setLiters(e.target.value)}
              placeholder="Ex: 45.5"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-lg"
              disabled={loading}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-500 mb-2">Kilométrage (km)</label>
          <input
            type="number"
            inputMode="numeric"
            value={mileage}
            onChange={(e) => setMileage(e.target.value)}
            placeholder="Ex: 45000"
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-lg"
            disabled={loading}
          />
        </div>

        {fills.length > 0 && (
          <section>
            <h2 className="text-sm font-semibold text-gray-500 mb-3">Dernières entrées</h2>
            <div className="space-y-2">
              {fills.map((fill) => (
                <div key={fill.id} className="bg-white border border-gray-100 rounded-xl p-3 flex justify-between">
                  <div>
                    <p className="font-semibold text-gray-900">{fill.vehicles?.name}</p>
                    <p className="text-sm text-gray-500">{fill.stations?.name}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(fill.date).toLocaleDateString("fr-FR")} · {fill.mileage.toLocaleString("fr-FR")} km
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-indigo-600">{fill.total_cost} €</p>
                    <p className="text-xs text-gray-400">{fill.liters} L</p>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}
      </main>

      <footer className="sticky bottom-0 bg-white border-t border-gray-100 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {totalCost && (
          <p className="text-center text-sm text-gray-500 mb-2">
            Total : <span className="font-bold text-indigo-600">{totalCost} €</span>
          </p>
        )}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full py-4 bg-indigo-600 text-white font-semibold rounded-xl text-base active:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? "Enregistrement..." : "Enregistrer le plein"}
        </button>
      </footer>
    </div>
  );
}
