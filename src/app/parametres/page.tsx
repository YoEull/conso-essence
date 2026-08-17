"use client";

import { useEffect, useState } from "react";
import { AppHeader } from "@/components/AppHeader";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageToggle } from "@/components/LanguageToggle";
import { UnitsSettings } from "@/components/UnitsSettings";
import { GroupSettings } from "@/components/GroupSettings";
import { UserProfile } from "@/components/UserProfile";
import { useLanguage } from "@/lib/i18n";
import { supabase } from "@/lib/supabase";
import { currencySymbolFor, volumeLabelFor, distanceLabelFor } from "@/lib/units";
import {
  getVehicles,
  getStations,
  getAllFills,
  renameVehicle,
  renameStation,
  deleteVehicle,
  deleteStation,
  setVehicleHidden,
  setStationHidden,
  upsertVehicle,
  upsertStation,
  Vehicle,
  Station,
} from "@/lib/data";

export default function ParametresPage() {
  const { t, lang } = useLanguage();
  const locale = lang === "fr" ? "fr-FR" : "en-US";
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
      alert(t("loadError") + (e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleExport = async () => {
    setExporting(true);
    try {
      const [fills, allVehicles, allStations] = await Promise.all([getAllFills(), getVehicles(), getStations()]);
      const XLSX = await import("xlsx");

      const fillsSheet = XLSX.utils.json_to_sheet(
        fills.map((f) => ({
          [t("date")]: new Date(f.date).toLocaleDateString(locale),
          [t("vehicle")]: f.vehicles?.name ?? "",
          [t("station")]: f.stations?.name ?? "",
          [t("odometer")]: f.odometer,
          [`${t("distance")} ${t("unit")}`]: distanceLabelFor(f.distance_unit),
          [t("price")]: f.price_per_unit,
          [t("volume")]: f.volume,
          [`${t("volume")} ${t("unit")}`]: volumeLabelFor(f.volume_unit),
          [t("totalCost")]: f.total_cost,
          [t("currency")]: `${f.currency} (${currencySymbolFor(f.currency)})`,
        }))
      );
      const vehiclesSheet = XLSX.utils.json_to_sheet(allVehicles.map((v) => ({ [t("vehicle")]: v.name })));
      const stationsSheet = XLSX.utils.json_to_sheet(allStations.map((s) => ({ [t("station")]: s.name })));

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, fillsSheet, t("fillsSheet"));
      XLSX.utils.book_append_sheet(workbook, vehiclesSheet, t("vehicles"));
      XLSX.utils.book_append_sheet(workbook, stationsSheet, t("stations"));

      const date = new Date().toISOString().slice(0, 10);
      XLSX.writeFile(workbook, `suivi-essence-${date}.xlsx`);
    } catch (e) {
      alert(t("exportError") + (e as Error).message);
    } finally {
      setExporting(false);
    }
  };

  const blockClass = "bg-white dark:bg-gray-900 rounded-2xl p-4 border border-gray-100 dark:border-gray-800";

  return (
    <div className="min-h-dvh bg-gray-50 dark:bg-gray-950 flex flex-col">
      <AppHeader title={t("settingsTitle")} />

      <main className="flex-1 overflow-y-auto px-4 py-5 space-y-6 pb-10">
        <section className={blockClass}>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">{t("profileTitle")}</h2>
          <UserProfile />
        </section>

        <section className={blockClass}>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">{t("appearance")}</h2>
          <ThemeToggle />
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mt-4 mb-3">{t("language")}</h2>
          <LanguageToggle />
        </section>

        <section className={blockClass}>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">{t("unitsTitle")}</h2>
          <UnitsSettings />
        </section>

        <section className={blockClass}>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3">{t("export")}</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">{t("exportDescription")}</p>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-xl disabled:opacity-50"
          >
            {exporting ? t("generating") : t("downloadExport")}
          </button>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-gray-500 dark:text-gray-400 mb-3 px-1">{t("groupTitle")}</h2>
          {loading ? (
            <p className="text-sm text-gray-400 dark:text-gray-500">{t("loading")}</p>
          ) : (
            <GroupSettings
              vehicles={vehicles}
              stations={stations}
              onRenameVehicle={async (id, name) => {
                await renameVehicle(id, name);
                await load();
              }}
              onRenameStation={async (id, name) => {
                await renameStation(id, name);
                await load();
              }}
              onDeleteVehicle={async (id) => {
                await deleteVehicle(id);
                await load();
              }}
              onDeleteStation={async (id) => {
                await deleteStation(id);
                await load();
              }}
              onToggleHiddenVehicle={async (id, hidden) => {
                await setVehicleHidden(id, hidden);
                await load();
              }}
              onToggleHiddenStation={async (id, hidden) => {
                await setStationHidden(id, hidden);
                await load();
              }}
              onAddVehicle={async (groupId, name) => {
                await upsertVehicle(groupId, name);
                await load();
              }}
              onAddStation={async (groupId, name) => {
                await upsertStation(groupId, name);
                await load();
              }}
            />
          )}
        </section>

        <button
          onClick={() => supabase.auth.signOut()}
          className="w-full py-3 text-red-600 dark:text-red-400 font-semibold rounded-xl border border-red-200 dark:border-red-900"
        >
          {t("signOut")}
        </button>
      </main>
    </div>
  );
}
