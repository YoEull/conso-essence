"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { AppHeader } from "@/components/AppHeader";
import { EditFillModal } from "@/components/EditFillModal";
import { getAllFills, getVehicles, getStations, FullFill, Vehicle, Station } from "@/lib/data";
import { useLanguage } from "@/lib/i18n";
import { useUnits } from "@/lib/units";

function chipClass(active: boolean) {
  return `shrink-0 whitespace-nowrap px-4 py-2 rounded-full text-sm font-medium border ${
    active
      ? "bg-indigo-600 border-indigo-600 text-white"
      : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200"
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
  const { t, lang } = useLanguage();
  const locale = lang === "fr" ? "fr-FR" : "en-US";
  const { volumeLabel, distanceLabel, currencySymbol, volumeToDisplay, distanceToDisplay } = useUnits();
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
      alert(t("loadError") + (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    <div className="min-h-dvh bg-gray-50 dark:bg-gray-950 flex flex-col">
      <AppHeader title={t("historyTitle")} />

      <main className="flex-1 overflow-y-auto px-4 py-5 space-y-4 pb-10">
        <div>
          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">{t("vehicle")}</label>
          <div className="flex gap-2 overflow-x-auto pb-1 -mx-4 px-4">
            <button onClick={() => setVehicleFilter("all")} className={chipClass(vehicleFilter === "all")}>
              {t("all")}
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
          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">{t("station")}</label>
          <div className="grid grid-rows-2 grid-flow-col gap-2 overflow-x-auto pb-1 -mx-4 px-4">
            <button onClick={() => setStationFilter("all")} className={chipClass(stationFilter === "all")}>
              {t("allFem")}
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
          <label className="block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">{t("period")}</label>
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
              <label className="block text-xs font-medium text-gray-400 dark:text-gray-500 mb-1">{t("from")}</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setActivePreset(null);
                }}
                className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-400 dark:text-gray-500 mb-1">{t("to")}</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setActivePreset(null);
                }}
                className="w-full px-3 py-2.5 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
              />
            </div>
          </div>
        </div>

        <p className="text-xs text-gray-400 dark:text-gray-500">
          {filtered.length} {t("entriesCount")}
        </p>

        {loading ? (
          <p className="text-sm text-gray-400 dark:text-gray-500">{t("loading")}</p>
        ) : (
          <div className="space-y-2">
            {filtered.map((fill) => (
              <div
                key={fill.id}
                className="bg-white dark:bg-gray-900 border border-gray-100 dark:border-gray-800 rounded-xl p-3"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-50">{fill.vehicles?.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{fill.stations?.name}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {new Date(fill.date).toLocaleDateString(locale)} ·{" "}
                      {Math.round(distanceToDisplay(fill.mileage)).toLocaleString(locale)} {distanceLabel}
                    </p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="text-right">
                      <p className="font-bold text-indigo-600 dark:text-indigo-400">
                        {fill.total_cost} {currencySymbol}
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        {volumeToDisplay(fill.liters).toFixed(1)} {volumeLabel}
                      </p>
                    </div>
                    <button
                      onClick={() => setEditingFill(fill)}
                      aria-label={t("editThisFill")}
                      className="p-2 -mr-2 text-gray-300 dark:text-gray-600 active:bg-gray-100 dark:active:bg-gray-800 rounded-lg"
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
