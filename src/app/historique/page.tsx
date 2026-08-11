"use client";

import { useEffect, useMemo, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { EditFillModal } from "@/components/EditFillModal";
import { getAllFills, getVehicles, getStations, FullFill, Vehicle, Station } from "@/lib/data";

function chipClass(active: boolean) {
  return `shrink-0 whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium border ${
    active ? "bg-indigo-600 border-indigo-600 text-white" : "bg-white border-gray-200 text-gray-700"
  }`;
}

export default function HistoriquePage() {
  const [fills, setFills] = useState<FullFill[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [vehicleFilter, setVehicleFilter] = useState<number | "all">("all");
  const [stationFilter, setStationFilter] = useState<number | "all">("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
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
              <button key={v.id} onClick={() => setVehicleFilter(v.id)} className={chipClass(vehicleFilter === v.id)}>
                {v.name}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-500 mb-2">Station</label>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
            <button onClick={() => setStationFilter("all")} className={chipClass(stationFilter === "all")}>
              Toutes
            </button>
            {stations.map((s) => (
              <button key={s.id} onClick={() => setStationFilter(s.id)} className={chipClass(stationFilter === s.id)}>
                {s.name}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-2">Du</label>
            <input
              type="date"
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-2">Au</label>
            <input
              type="date"
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm"
            />
          </div>
        </div>

        <p className="text-xs text-gray-400">{filtered.length} entrée(s)</p>

        {loading ? (
          <p className="text-sm text-gray-400">Chargement...</p>
        ) : (
          <div className="space-y-2">
            {filtered.map((fill) => (
              <div key={fill.id} className="bg-white border border-gray-100 rounded-xl p-3">
                <div className="flex justify-between">
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
                <div className="flex justify-end mt-2 pt-2 border-t border-gray-50">
                  <button
                    onClick={() => setEditingFill(fill)}
                    aria-label="Modifier ce plein"
                    className="p-2 text-gray-300 active:bg-gray-100 rounded-lg"
                  >
                    ✎
                  </button>
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
