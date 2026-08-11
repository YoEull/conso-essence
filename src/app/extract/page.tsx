"use client";

import { useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { getAllFills, getVehicles, getStations } from "@/lib/data";

export default function ExtractPage() {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const [fills, vehicles, stations] = await Promise.all([getAllFills(), getVehicles(), getStations()]);
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
      const vehiclesSheet = XLSX.utils.json_to_sheet(vehicles.map((v) => ({ Véhicule: v.name })));
      const stationsSheet = XLSX.utils.json_to_sheet(stations.map((s) => ({ Station: s.name })));

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
      <AppHeader title="Extraire" />
      <main className="flex-1 px-4 py-5">
        <p className="text-sm text-gray-500 mb-4">
          Génère un fichier Excel (.xlsx) avec l&apos;ensemble de vos pleins, véhicules et stations.
        </p>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="w-full py-4 bg-indigo-600 text-white font-semibold rounded-xl text-base active:bg-indigo-700 disabled:opacity-50"
        >
          {exporting ? "Génération..." : "Télécharger l'export Excel (.xlsx)"}
        </button>
      </main>
    </div>
  );
}
