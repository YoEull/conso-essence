"use client";

import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { EditableNameList } from "@/components/EditableNameList";
import {
  getVehicles,
  getStations,
  getAllFills,
  renameVehicle,
  renameStation,
  Vehicle,
  Station,
} from "@/lib/data";

export default function ParametresPage() {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [v, s] = await Promise.all([getVehicles(), getStations()]);
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

  const handleExport = async () => {
    setExporting(true);
    try {
      const [fills, allVehicles, allStations] = await Promise.all([getAllFills(), getVehicles(), getStations()]);
      const XLSX = await import("xlsx");

      const fillsSheet = XLSX.utils.json_to_sheet(
        fills.map((f) => ({
          Date: new Date(f.date).toLocaleDateString("fr-FR"),
          Véhicule: f.vehicles?.name ?? "",
          Station: f.stations?.name ?? "",
          "Kilométrage (km)": f.mileage,
          "Prix / L (€)": f.price_per_liter,
          "Litres (L)": f.liters,
          "Coût total (€)": f.total_cost,
        }))
      );
      const vehiclesSheet = XLSX.utils.json_to_sheet(allVehicles.map((v) => ({ Véhicule: v.name })));
      const stationsSheet = XLSX.utils.json_to_sheet(allStations.map((s) => ({ Station: s.name })));

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, fillsSheet, "Pleins");
      XLSX.utils.book_append_sheet(workbook, vehiclesSheet, "Véhicules");
      XLSX.utils.book_append_sheet(workbook, stationsSheet, "Stations");

      const date = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(workbook, `suivi-essence-${date}.xlsx`);
    } catch (e) {
      alert("Erreur export : " + (e as Error).message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="min-h-dvh bg-gray-50 flex flex-col">
      <AppHeader title="⚙️ Paramètres" />

      <main className="flex-1 overflow-y-auto px-4 py-5 space-y-8 pb-10">
        <section>
          <h2 className="text-sm font-semibold text-gray-500 mb-3">Export</h2>
          <p className="text-sm text-gray-500 mb-3">
            Génère un fichier Excel (.xlsx) avec l&apos;ensemble de vos pleins, véhicules et stations.
          </p>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl disabled:opacity-50"
          >
            {exporting ? "Génération..." : "Télécharger l'export Excel (.xlsx)"}
          </button>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-gray-500 mb-3">Véhicules</h2>
          {loading ? (
            <p className="text-sm text-gray-400">Chargement...</p>
          ) : (
            <EditableNameList
              items={vehicles}
              onRename={async (id, name) => {
                await renameVehicle(id, name);
                await load();
              }}
            />
          )}
        </section>

        <section>
          <h2 className="text-sm font-semibold text-gray-500 mb-3">Stations</h2>
          {loading ? (
            <p className="text-sm text-gray-400">Chargement...</p>
          ) : (
            <EditableNameList
              items={stations}
              onRename={async (id, name) => {
                await renameStation(id, name);
                await load();
              }}
            />
          )}
        </section>
      </main>
    </div>
  );
}
