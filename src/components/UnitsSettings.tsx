"use client";

import { useUnits, VOLUME_LABELS, DISTANCE_LABELS, CURRENCIES, type VolumeUnit, type DistanceUnit, type CurrencyCode } from "@/lib/units";
import { useLanguage } from "@/lib/i18n";

function chipClass(active: boolean) {
  return `flex-1 py-3 rounded-xl text-sm font-medium border ${
    active
      ? "bg-indigo-600 border-indigo-600 text-white"
      : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-200"
  }`;
}

export function UnitsSettings() {
  const { t } = useLanguage();
  const { volumeUnit, setVolumeUnit, distanceUnit, setDistanceUnit, currency, setCurrency } = useUnits();

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-2">{t("volume")}</p>
        <div className="flex gap-2">
          {(Object.keys(VOLUME_LABELS) as VolumeUnit[]).map((unit) => (
            <button
              key={unit}
              type="button"
              onClick={() => setVolumeUnit(unit)}
              className={chipClass(volumeUnit === unit)}
            >
              {VOLUME_LABELS[unit]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-2">{t("distance")}</p>
        <div className="flex gap-2">
          {(Object.keys(DISTANCE_LABELS) as DistanceUnit[]).map((unit) => (
            <button
              key={unit}
              type="button"
              onClick={() => setDistanceUnit(unit)}
              className={chipClass(distanceUnit === unit)}
            >
              {DISTANCE_LABELS[unit]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-2">{t("currency")}</p>
        <select
          value={currency}
          onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
          className="w-full px-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
        >
          {(Object.keys(CURRENCIES) as CurrencyCode[]).map((code) => (
            <option key={code} value={code}>
              {CURRENCIES[code].symbol} {code} — {CURRENCIES[code].label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
