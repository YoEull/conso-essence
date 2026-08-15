"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type VolumeUnit = "L" | "gal_us" | "gal_uk";
export type DistanceUnit = "km" | "mi";
export type CurrencyCode = "EUR" | "USD" | "GBP" | "JPY" | "CNY" | "CAD" | "INR" | "KRW" | "CHF" | "AUD";

export const VOLUME_LABELS: Record<VolumeUnit, string> = {
  L: "L",
  gal_us: "gal (US)",
  gal_uk: "gal (UK)",
};

export const DISTANCE_LABELS: Record<DistanceUnit, string> = {
  km: "km",
  mi: "mi",
};

export const VOLUME_EXAMPLES: Record<VolumeUnit, { price: string; volume: string }> = {
  L: { price: "1.65", volume: "45.5" },
  gal_us: { price: "3.50", volume: "12" },
  gal_uk: { price: "5.80", volume: "10" },
};

export const DISTANCE_EXAMPLES: Record<DistanceUnit, string> = {
  km: "45000",
  mi: "28000",
};

export const CURRENCIES: Record<CurrencyCode, { symbol: string; label: string }> = {
  EUR: { symbol: "€", label: "Euro" },
  USD: { symbol: "$", label: "US Dollar" },
  GBP: { symbol: "£", label: "British Pound" },
  JPY: { symbol: "¥", label: "Japanese Yen" },
  CNY: { symbol: "¥", label: "Chinese Yuan" },
  CAD: { symbol: "$", label: "Canadian Dollar" },
  INR: { symbol: "₹", label: "Indian Rupee" },
  KRW: { symbol: "₩", label: "South Korean Won" },
  CHF: { symbol: "Fr", label: "Swiss Franc" },
  AUD: { symbol: "$", label: "Australian Dollar" },
};

// Every fill stores its own volume_unit/distance_unit/currency (single
// source of truth, no conversion). These helpers look up the label/symbol
// for an arbitrary stored code — NOT the current global preference below,
// which only supplies the default for new entries in Paramètres.
export function volumeLabelFor(unit: string): string {
  return (VOLUME_LABELS as Record<string, string>)[unit] ?? unit;
}

export function distanceLabelFor(unit: string): string {
  return (DISTANCE_LABELS as Record<string, string>)[unit] ?? unit;
}

export function currencySymbolFor(code: string): string {
  return (CURRENCIES as Record<string, { symbol: string; label: string }>)[code]?.symbol ?? code;
}

type UnitsState = {
  volumeUnit: VolumeUnit;
  distanceUnit: DistanceUnit;
  currency: CurrencyCode;
  setVolumeUnit: (u: VolumeUnit) => void;
  setDistanceUnit: (u: DistanceUnit) => void;
  setCurrency: (c: CurrencyCode) => void;
  currencySymbol: string;
  volumeLabel: string;
  distanceLabel: string;
};

const UnitsContext = createContext<UnitsState | null>(null);

export function UnitsProvider({ children }: { children: ReactNode }) {
  const [volumeUnit, setVolumeUnitState] = useState<VolumeUnit>("L");
  const [distanceUnit, setDistanceUnitState] = useState<DistanceUnit>("km");
  const [currency, setCurrencyState] = useState<CurrencyCode>("EUR");

  useEffect(() => {
    const storedVolume = localStorage.getItem("volumeUnit");
    if (storedVolume && storedVolume in VOLUME_LABELS) setVolumeUnitState(storedVolume as VolumeUnit);
    const storedDistance = localStorage.getItem("distanceUnit");
    if (storedDistance && storedDistance in DISTANCE_LABELS) setDistanceUnitState(storedDistance as DistanceUnit);
    const storedCurrency = localStorage.getItem("currency");
    if (storedCurrency && storedCurrency in CURRENCIES) setCurrencyState(storedCurrency as CurrencyCode);
  }, []);

  const setVolumeUnit = (u: VolumeUnit) => {
    setVolumeUnitState(u);
    localStorage.setItem("volumeUnit", u);
  };
  const setDistanceUnit = (u: DistanceUnit) => {
    setDistanceUnitState(u);
    localStorage.setItem("distanceUnit", u);
  };
  const setCurrency = (c: CurrencyCode) => {
    setCurrencyState(c);
    localStorage.setItem("currency", c);
  };

  const value: UnitsState = {
    volumeUnit,
    distanceUnit,
    currency,
    setVolumeUnit,
    setDistanceUnit,
    setCurrency,
    currencySymbol: CURRENCIES[currency].symbol,
    volumeLabel: VOLUME_LABELS[volumeUnit],
    distanceLabel: DISTANCE_LABELS[distanceUnit],
  };

  return <UnitsContext.Provider value={value}>{children}</UnitsContext.Provider>;
}

export function useUnits() {
  const ctx = useContext(UnitsContext);
  if (!ctx) throw new Error("useUnits must be used within UnitsProvider");
  return ctx;
}
