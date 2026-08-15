"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
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
import { useLanguage } from "@/lib/i18n";
import { useUnits, VOLUME_EXAMPLES, DISTANCE_EXAMPLES } from "@/lib/units";

const LONG_PRESS_MS = 500;
const EDIT_WINDOW_MS = 8 * 60 * 60 * 1000;

export default function Home() {
  const router = useRouter();
  const { t, lang } = useLanguage();
  const locale = lang === "fr" ? "fr-FR" : "en-US";
  const {
    volumeUnit,
    distanceUnit,
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
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [fills, setFills] = useState<Fill[]>([]);
  const [loading, setLoading] = useState(false);
  const [longPressFill, setLongPressFill] = useState<Fill | null>(null);
  const pressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pressMovedRef = useRef(false);

  const [selectedVehicleId, setSelectedVehicleId] = useState<number | "">("");
  const [odometer, setOdometer] = useState("");
  const [price, setPrice] = useState("");
  const [volume, setVolume] = useState("");
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
      alert(t("loadError") + (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    const lastVehicleId = localStorage.getItem("lastVehicleId");
    if (lastVehicleId) setSelectedVehicleId(Number(lastVehicleId));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectVehicle = (id: number | "") => {
    setSelectedVehicleId(id);
    if (id) localStorage.setItem("lastVehicleId", String(id));
  };

  const addVehicle = async (name: string) => {
    const vehicle = await upsertVehicle(name);
    setVehicles((prev) => (prev.some((v) => v.id === vehicle.id) ? prev : [vehicle, ...prev]));
    selectVehicle(vehicle.id);
  };

  const selectStation = (id: number | "") => setSelectedStationId(id);

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
      alert(t("locationError"));
    } finally {
      setFindingStation(false);
    }
  };

  const handleSubmit = async () => {
    if (!selectedVehicleId || !odometer || !price || !volume || !selectedStationId) {
      alert(t("fillAllFields"));
      return;
    }

    setLoading(true);
    try {
      await addFill({
        vehicle_id: Number(selectedVehicleId),
        station_id: Number(selectedStationId),
        mileage: distanceFromDisplay(parseFloat(odometer)),
        price_per_liter: pricePerVolumeFromDisplay(parseFloat(price)),
        liters: volumeFromDisplay(parseFloat(volume)),
        total_cost: Number((parseFloat(price) * parseFloat(volume)).toFixed(2)),
      });

      setOdometer("");
      setPrice("");
      setVolume("");
      setSelectedStationId("");

      await loadData();
    } catch (e) {
      alert(t("genericError") + (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const totalCost = price && volume ? (parseFloat(price) * parseFloat(volume)).toFixed(2) : null;

  const isEditableNow = (fill: Fill) => Date.now() - new Date(fill.date).getTime() <= EDIT_WINDOW_MS;

  const handlePressStart = (fill: Fill) => {
    pressMovedRef.current = false;
    pressTimerRef.current = setTimeout(() => {
      if (!pressMovedRef.current) setLongPressFill(fill);
    }, LONG_PRESS_MS);
  };

  const handlePressMove = () => {
    pressMovedRef.current = true;
    if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
  };

  const handlePressEnd = () => {
    if (pressTimerRef.current) clearTimeout(pressTimerRef.current);
  };

  const blockClass = "bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800";
  const inputClass =
    "w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl text-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500";
  const labelClass = "block text-sm font-medium text-gray-500 dark:text-gray-400 mb-2";

  return (
    <div className="min-h-dvh bg-gray-50 dark:bg-gray-950 flex flex-col">
      <AppHeader
        title={t("appTitle")}
        rightAction={
          <button
            onClick={loadData}
            disabled={loading}
            className="p-2 rounded-lg text-gray-500 dark:text-gray-400 active:bg-gray-100 dark:active:bg-gray-800"
          >
            <span className={loading ? "inline-block animate-spin" : ""}>↻</span>
          </button>
        }
      />

      <main className="flex-1 overflow-y-auto px-4 py-5 space-y-2 pb-40">
        <div className={blockClass}>
          <ChipPicker
            label={t("vehicle")}
            items={vehicles}
            selectedId={selectedVehicleId}
            onSelect={selectVehicle}
            onAddNew={addVehicle}
          />
        </div>

        <div className={blockClass}>
          <ChipPicker
            label={t("station")}
            items={stations}
            selectedId={selectedStationId}
            onSelect={selectStation}
            onAddNew={addStation}
            extraAction={{ icon: "📍", onClick: findNearestStation, loading: findingStation }}
            rows={2}
          />
        </div>

        <div className={`${blockClass} space-y-4`}>
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
                placeholder={`${t("exPrefix")} ${VOLUME_EXAMPLES[volumeUnit].price}`}
                className={inputClass}
                disabled={loading}
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
                placeholder={`${t("exPrefix")} ${VOLUME_EXAMPLES[volumeUnit].volume}`}
                className={inputClass}
                disabled={loading}
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
              placeholder={`${t("exPrefix")} ${DISTANCE_EXAMPLES[distanceUnit]}`}
              className={inputClass}
              disabled={loading}
            />
          </div>
        </div>

        {fills.length > 0 && (
          <div className={blockClass}>
            <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">{t("recentEntries")}</h2>
            <div className="space-y-2">
              {fills.map((fill) => (
                <div
                  key={fill.id}
                  onTouchStart={() => handlePressStart(fill)}
                  onTouchMove={handlePressMove}
                  onTouchEnd={handlePressEnd}
                  className="bg-gray-50 dark:bg-gray-800 border border-gray-100 dark:border-gray-700 rounded-xl p-3 flex justify-between select-none"
                >
                  <div>
                    <p className="font-semibold text-gray-900 dark:text-gray-50">{fill.vehicles?.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{fill.stations?.name}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {new Date(fill.date).toLocaleDateString(locale)} ·{" "}
                      {Math.round(distanceToDisplay(fill.mileage)).toLocaleString(locale)} {distanceLabel}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-indigo-600 dark:text-indigo-400">
                      {fill.total_cost} {currencySymbol}
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                      {volumeToDisplay(fill.liters).toFixed(1)} {volumeLabel}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      <footer className="sticky bottom-0 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        {totalCost && (
          <p className="text-center text-sm text-gray-500 dark:text-gray-400 mb-2">
            {t("total")} :{" "}
            <span className="font-bold text-indigo-600 dark:text-indigo-400">
              {totalCost} {currencySymbol}
            </span>
          </p>
        )}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full py-4 bg-indigo-600 text-white font-semibold rounded-xl text-base active:bg-indigo-700 disabled:opacity-50"
        >
          {loading ? t("saving") : t("saveFill")}
        </button>
      </footer>

      {longPressFill && (
        <div className="fixed inset-0 z-40 flex items-end" onClick={() => setLongPressFill(null)}>
          <div className="absolute inset-0 bg-black/30" />
          <div
            className="relative bg-white dark:bg-gray-900 w-full rounded-t-2xl p-4 pb-[max(1rem,env(safe-area-inset-bottom))] space-y-3"
            onClick={(e) => e.stopPropagation()}
          >
            {isEditableNow(longPressFill) ? (
              <>
                <p className="text-sm text-gray-600 dark:text-gray-300">
                  {longPressFill.vehicles?.name} · {longPressFill.stations?.name} ·{" "}
                  {new Date(longPressFill.date).toLocaleDateString(locale)}
                </p>
                <button
                  onClick={() => router.push(`/historique?edit=${longPressFill.id}`)}
                  className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl"
                >
                  {t("edit")}
                </button>
                <button
                  onClick={() => setLongPressFill(null)}
                  className="w-full py-3 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-semibold rounded-xl"
                >
                  {t("cancel")}
                </button>
              </>
            ) : (
              <>
                <p className="text-sm text-gray-600 dark:text-gray-300">{t("editWithinWindow")}</p>
                <button
                  onClick={() => router.push("/historique")}
                  className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl"
                >
                  {t("goToHistory")}
                </button>
                <button
                  onClick={() => setLongPressFill(null)}
                  className="w-full py-3 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-300 font-semibold rounded-xl"
                >
                  {t("close")}
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
