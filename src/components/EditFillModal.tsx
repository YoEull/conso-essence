"use client";

import { useState } from "react";
import { ChipPicker } from "@/components/ChipPicker";
import { updateFill, FullFill, Vehicle, Station } from "@/lib/data";
import { useLanguage } from "@/lib/i18n";
import { useUnits } from "@/lib/units";

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
  const { t } = useLanguage();
  const {
    volumeLabel,
    distanceLabel,
    currencySymbol,
    volumeToDisplay,
    distanceToDisplay,
    pricePerVolumeToDisplay,
    volumeFromDisplay,
    distanceFromDisplay,
    pricePerVolumeFromDisplay,
  } = useUnits();
  const [vehicleId, setVehicleId] = useState<number | "">(fill.vehicle_id);
  const [stationId, setStationId] = useState<number | "">(fill.station_id);
  const [odometer, setOdometer] = useState(String(distanceToDisplay(fill.mileage)));
  const [price, setPrice] = useState(String(pricePerVolumeToDisplay(fill.price_per_liter)));
  const [volume, setVolume] = useState(String(volumeToDisplay(fill.liters)));
  const [date, setDate] = useState(fill.date.slice(0, 10));
  const [saving, setSaving] = useState(false);

  const inputClass =
    "w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl text-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100";
  const labelClass = "block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2";

  const save = async () => {
    if (!vehicleId || !stationId || !odometer || !price || !volume || !date) {
      alert(t("fillAllFields"));
      return;
    }
    setSaving(true);
    try {
      await updateFill(fill.id, {
        vehicle_id: Number(vehicleId),
        station_id: Number(stationId),
        mileage: distanceFromDisplay(parseFloat(odometer)),
        price_per_liter: pricePerVolumeFromDisplay(parseFloat(price)),
        liters: volumeFromDisplay(parseFloat(volume)),
        total_cost: Number((parseFloat(price) * parseFloat(volume)).toFixed(2)),
        date: new Date(date).toISOString(),
      });
      onSaved();
    } catch (e) {
      alert(t("genericError") + (e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-40 flex items-end">
      <div className="absolute inset-0 bg-black/30" onClick={onClose} />
      <div className="relative bg-white dark:bg-gray-900 w-full rounded-t-2xl p-4 pb-[max(1rem,env(safe-area-inset-bottom))] max-h-[85vh] overflow-y-auto space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900 dark:text-gray-50">{t("editFillTitle")}</h2>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 dark:text-gray-400 active:bg-gray-100 dark:active:bg-gray-800 rounded-lg"
          >
            ✕
          </button>
        </div>

        <ChipPicker label={t("vehicle")} items={vehicles} selectedId={vehicleId} onSelect={setVehicleId} />
        <ChipPicker label={t("station")} items={stations} selectedId={stationId} onSelect={setStationId} />

        <div>
          <label className={labelClass}>{t("date")}</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={inputClass} />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className={labelClass}>
              {t("price")} / {volumeLabel} ({currencySymbol})
            </label>
            <input
              type="number"
              inputMode="decimal"
              step="0.001"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>
              {t("volume")} ({volumeLabel})
            </label>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              value={volume}
              onChange={(e) => setVolume(e.target.value)}
              className={inputClass}
            />
          </div>
        </div>

        <div>
          <label className={labelClass}>
            {t("odometer")} ({distanceLabel})
          </label>
          <input
            type="number"
            inputMode="numeric"
            value={odometer}
            onChange={(e) => setOdometer(e.target.value)}
            className={inputClass}
          />
        </div>

        <button
          onClick={save}
          disabled={saving}
          className="w-full py-4 bg-indigo-600 text-white font-semibold rounded-xl text-base active:bg-indigo-700 disabled:opacity-50"
        >
          {saving ? t("saving") : t("saveChanges")}
        </button>
      </div>
    </div>
  );
}
