"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type VolumeUnit = "L" | "gal_us" | "gal_uk";
export type DistanceUnit = "km" | "mi";
export type CurrencyCode = "EUR" | "USD" | "GBP" | "JPY" | "CNY" | "CAD" | "INR" | "KRW" | "CHF" | "AUD";

// Conversion factors are "display units per 1 canonical unit" (liters, km).
const VOLUME_FACTORS: Record<VolumeUnit, number> = {
  L: 1,
  gal_us: 1 / 3.785411784,
  gal_uk: 1 / 4.54609,
};

const DISTANCE_FACTORS: Record<DistanceUnit, number> = {
  km: 1,
  mi: 1 / 1.609344,
};

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
  // Canonical (DB: liters, km) -> display value
  volumeToDisplay: (liters: number) => number;
  distanceToDisplay: (km: number) => number;
  pricePerVolumeToDisplay: (pricePerLiter: number) => number;
  // Display value (user input) -> canonical (DB: liters, km)
  volumeFromDisplay: (value: number) => number;
  distanceFromDisplay: (value: number) => number;
  pricePerVolumeFromDisplay: (value: number) => number;
};

const UnitsContext = createContext<UnitsState | null>(null);

export function UnitsProvider({ children }: { children: ReactNode }) {
  const [volumeUnit, setVolumeUnitState] = useState<VolumeUnit>("L");
  const [distanceUnit, setDistanceUnitState] = useState<DistanceUnit>("km");
  const [currency, setCurrencyState] = useState<CurrencyCode>("EUR");

  useEffect(() => {
    const storedVolume = localStorage.getItem("volumeUnit");
    if (storedVolume && storedVolume in VOLUME_FACTORS) setVolumeUnitState(storedVolume as VolumeUnit);
    const storedDistance = localStorage.getItem("distanceUnit");
    if (storedDistance && storedDistance in DISTANCE_FACTORS) setDistanceUnitState(storedDistance as DistanceUnit);
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

  const volumeFactor = VOLUME_FACTORS[volumeUnit];
  const distanceFactor = DISTANCE_FACTORS[distanceUnit];

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
    volumeToDisplay: (liters) => liters * volumeFactor,
    distanceToDisplay: (km) => km * distanceFactor,
    pricePerVolumeToDisplay: (pricePerLiter) => pricePerLiter / volumeFactor,
    volumeFromDisplay: (value) => value / volumeFactor,
    distanceFromDisplay: (value) => value / distanceFactor,
    pricePerVolumeFromDisplay: (value) => value * volumeFactor,
  };

  return <UnitsContext.Provider value={value}>{children}</UnitsContext.Provider>;
}

export function useUnits() {
  const ctx = useContext(UnitsContext);
  if (!ctx) throw new Error("useUnits must be used within UnitsProvider");
  return ctx;
}
