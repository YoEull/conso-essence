"use client";

import { useState } from "react";
import { ChipPicker } from "@/components/ChipPicker";
import { updateFill, FullFill, Vehicle, Station } from "@/lib/data";

export function EditFillModal({
  fill,
  vehicles,
  stations,
  onClose,
  onSaved,
}: {
  fill: FullFill;
  vehicles: Vehicle[];
  stations: Station[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const [vehicleId, setVehicleId] = useState<number | "">(fill.vehicle_id);
  const [stationId, setStationId] = useState<number | "">(fill.station_id);
  const [mileage, setMileage] = useState(String(fill.mileage));
  const [pricePerLiter, setPricePerLiter] = useState(String(fill.price_per_liter));
  const [liters, setLiters] = useState(String(fill.liters));
  const [date, setDate] = useState(fill.date.slice(0, 10));
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!vehicleId || !stationId || !mileage || !pricePerLiter || !liters || !date) {
      alert("Veuillez remplir tous les champs");
      return;
    }
    setSaving(true);
    try {
      await updateFill(fill.id, {
        vehicle_id: Number(vehicleId),
        station_id: Number(stationId),
        mileage: parseFloat(mileage),
        price_per_liter: parseFloat(pricePerLiter),
        liters: parseFloat(liters),
        total_cost: Number((parseFloat(pricePerLiter) * parseFloat(liters)).toFixed(2)),
        date: new Date(date).toISOString(),
      });
      onSaved();
    } catch (e) {
      alert("Erreur : " + (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white w-full rounded-t-2xl p-4 pb-[max(1rem,env(safe-area-inset-bottom))] max-h-[85vh] overflow-y-auto space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">Modifier le plein</h2>
          <button onClick={onClose} className="p-2 text-gray-500 active:bg-gray-100 rounded-lg">
            ✕
          </button>
        </div>

        <ChipPicker label="Véhicule" items={vehicles} selectedId={vehicleId} onSelect={setVehicleId} />
        <ChipPicker label="Station" items={stations} selectedId={stationId} onSelect={setStationId} />

        <div>
          <label className="block text-sm font-medium text-gray-500 mb-2">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-base"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-500 mb-2">Prix / L (€)</label>
            <input
              type="number"
              inputMode="decimal"
              step="0.001"
              value={pricePerLiter}
              onChange={(e) => setPricePerLiter(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-lg"
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
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-lg"
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
            className="w-full px-4 py-3 border border-gray-200 rounded-xl text-lg"
          />
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="w-full py-4 bg-indigo-600 text-white font-semibold rounded-xl text-base active:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? "Enregistrement..." : "Enregistrer les modifications"}
        </button>
      </div>
    </div>
  );
}
