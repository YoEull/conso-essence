"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { EditFillModal } from "@/components/EditFillModal";
import { getAllFills, getVehicles, getStations, FullFill, Vehicle, Station } from "@/lib/data";

function chipClass(active: boolean) {
  return `shrink-0 whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium border ${
    active ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white border-gray-200 text-gray-700"
  }`;
}

const DATE_PRESETS: { key: string; label: string; days: number }[] = [
  { key: "1j", label: "1j", days: 1 },
  { key: "1w", label: "1w", days: 7 },
  { key: "1m", label: "1m", days: 30 },
  { key: "6m", label: "6m", days: 182 },
  { key: "1y", label: "1y", days: 365 },
];

function HistoriqueContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [fills, setFills] = useState<FullFill[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [vehicleFilter, setVehicleFilter] = useState<number | "all">("all");
  const [stationFilter, setStationFilter] = useState<number | "all">("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [activePreset, setActivePreset] = useState<string | null>(null);
  const [editingFill, setEditingFill] = useState<FullFill | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [f, v, s] = await Promise.all([getAllFills(), getVehicles(), getStations()]);
      setFills(f);
      setVehicles(v);
      setStations(s);
    } catch (e) {
      alert("Erreur de chargement : " + (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  // Deep link from "Nouveau plein" (long-press → Éditer) opens this fill directly.
  useEffect(() => {
    const editId = searchParams.get("edit");
    if (editId && fills.length > 0) {
      const target = fills.find((f) => f.id === Number(editId));
      if (target) setEditingFill(target);
      router.replace("/historique");
    }
  }, [fills, searchParams, router]);

  const applyPreset = (key: string, days: number) => {
    if (activePreset === key) {
      setActivePreset(null);
      setFromDate("");
      setToDate("");
      return;
    }
    const from = new Date();
    from.setDate(from.getDate() - days);
    setFromDate(from.toISOString().slice(0, 10));
    setToDate("");
    setActivePreset(key);
  };

  const filtered = useMemo(() => {
    return fills.filter((fill) => {
      if (vehicleFilter !== "all" && fill.vehicle_id !== vehicleFilter) return false;
      if (stationFilter !== "all" && fill.station_id !== stationFilter) return false;
      if (fromDate && fill.date < fromDate) return false;
      if (toDate && fill.date > `${toDate}T23:59:59`) return false;
      return true;
    });
  }, [fills, vehicleFilter, stationFilter, fromDate, toDate]);

  return (
    <div className="min-h-dvh bg-gray-50 flex flex-col">
      <AppHeader title="Historique" />

      <main className="flex-1 overflow-y-auto px-4 py-5 space-y-4 pb-10">
        <div>
          <label className="block text-sm font-medium text-gray-500 mb-2">Véhicule</label>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
            <button onClick={() => setVehicleFilter("all")} className={chipClass(vehicleFilter === "all")}>
              Tous
            </button>
            {vehicles.map((v) => (
              <button
                key={v.id}
                onClick={() => setVehicleFilter(vehicleFilter === v.id ? "all" : v.id)}
                className={chipClass(vehicleFilter === v.id)}
              >
                {v.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-500 mb-2">Station</label>
          <div className="grid grid-rows-2 grid-flow-col gap-2 overflow-x-auto pb-1 -mx-4 px-4">
            <button onClick={() => setStationFilter("all")} className={chipClass(stationFilter === "all")}>
              Toutes
            </button>
            {stations.map((s) => (
              <button
                key={s.id}
                onClick={() => setStationFilter(stationFilter === s.id ? "all" : s.id)}
                className={chipClass(stationFilter === s.id)}
              >
                {s.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-500 mb-2">Période</label>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4 mb-3">
            {DATE_PRESETS.map((preset) => (
              <button
                key={preset.key}
                onClick={() => applyPreset(preset.key, preset.days)}
                className={chipClass(activePreset === preset.key)}
              >
                {preset.label}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Du</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setActivePreset(null);
                }}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 mb-1">Au</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setActivePreset(null);
                }}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm"
              />
            </div>
          </div>
        </div>

        <p className="text-xs text-gray-400">{filtered.length} entrée(s)</p>

        {loading ? (
          <p className="text-sm text-gray-400">Chargement...</p>
        ) : (
          <div className="space-y-2">
            {filtered.map((fill) => (
              <div key={fill.id} className="bg-white border border-gray-100 rounded-xl p-3">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-gray-900">{fill.vehicles?.name}</p>
                    <p className="text-sm text-gray-500">{fill.stations?.name}</p>
                    <p className="text-xs text-gray-400">
                      {new Date(fill.date).toLocaleDateString("fr-FR")} · {fill.mileage.toLocaleString("fr-FR")} km
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="text-right">
                      <p className="font-bold text-indigo-600">{fill.total_cost} €</p>
                      <p className="text-xs text-gray-400">{fill.liters} L</p>
                    </div>
                    <button
                      onClick={() => setEditingFill(fill)}
                      aria-label="Modifier ce plein"
                      className="p-2 -mr-2 text-gray-300 active:bg-gray-100 rounded-lg"
                    >
                      ✎
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {editingFill && (
        <EditFillModal
          fill={editingFill}
          vehicles={vehicles}
          stations={stations}
          onClose={() => setEditingFill(null)}
          onSaved={() => {
            setEditingFill(null);
            load();
          }}
        />
      )}
    </div>
  );
}

export default function HistoriquePage() {
  return (
    <Suspense fallback={null}>
      <HistoriqueContent />
    </Suspense>
  );
}
