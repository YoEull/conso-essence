"use client";

import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Lang = "fr" | "en";

const translations = {
  fr: {
    appTitle: "Suivi Essence",
    navNewFill: "Nouveau plein",
    navHistory: "Historique",
    navSettings: "Paramètres",
    menu: "Menu",

    vehicle: "Véhicule",
    station: "Station",
    pricePerLiter: "Prix / L (€)",
    liters: "Litres",
    mileage: "Kilométrage (km)",
    pricePlaceholder: "Ex: 1.65",
    litersPlaceholder: "Ex: 45.5",
    mileagePlaceholder: "Ex: 45000",
    total: "Total",
    recentEntries: "Dernières entrées",
    saveFill: "Enregistrer le plein",
    saving: "Enregistrement...",
    namePlaceholder: "Nom",
    fillAllFields: "Veuillez remplir tous les champs",
    loadError: "Erreur de chargement : ",
    genericError: "Erreur : ",
    locationError: "Impossible d'obtenir votre position.",

    editWithinWindow: "La modification rapide n'est possible que dans les 8h suivant la saisie. Rendez-vous dans Historique pour modifier cette entrée.",
    edit: "Éditer",
    cancel: "Annuler",
    goToHistory: "Aller dans Historique",
    close: "Fermer",

    historyTitle: "Historique",
    all: "Tous",
    allFem: "Toutes",
    period: "Période",
    from: "Du",
    to: "Au",
    entriesCount: "entrée(s)",
    loading: "Chargement...",
    editThisFill: "Modifier ce plein",

    settingsTitle: "⚙️ Paramètres",
    appearance: "Apparence",
    light: "Clair",
    dark: "Sombre",
    language: "Langue",
    export: "Export",
    exportDescription: "Génère un fichier Excel (.xlsx) avec l'ensemble de vos pleins, véhicules et stations.",
    downloadExport: "Télécharger l'export Excel (.xlsx)",
    generating: "Génération...",
    vehicles: "Véhicules",
    stations: "Stations",
    exportError: "Erreur export : ",

    editFillTitle: "Modifier le plein",
    date: "Date",
    saveChanges: "Enregistrer les modifications",
    totalCost: "Coût total (€)",
    fillsSheet: "Pleins",
    editLabel: "Modifier",
  },
  en: {
    appTitle: "Fuel Tracker",
    navNewFill: "New fill-up",
    navHistory: "History",
    navSettings: "Settings",
    menu: "Menu",

    vehicle: "Vehicle",
    station: "Station",
    pricePerLiter: "Price / L",
    liters: "Liters",
    mileage: "Mileage (km)",
    pricePlaceholder: "E.g. 1.65",
    litersPlaceholder: "E.g. 45.5",
    mileagePlaceholder: "E.g. 45000",
    total: "Total",
    recentEntries: "Recent entries",
    saveFill: "Save fill-up",
    saving: "Saving...",
    namePlaceholder: "Name",
    fillAllFields: "Please fill in all fields",
    loadError: "Loading error: ",
    genericError: "Error: ",
    locationError: "Couldn't get your location.",

    editWithinWindow: "Quick edit is only available within 8h of entry. Go to History to edit this entry.",
    edit: "Edit",
    cancel: "Cancel",
    goToHistory: "Go to History",
    close: "Close",

    historyTitle: "History",
    all: "All",
    allFem: "All",
    period: "Period",
    from: "From",
    to: "To",
    entriesCount: "entries",
    loading: "Loading...",
    editThisFill: "Edit this fill-up",

    settingsTitle: "⚙️ Settings",
    appearance: "Appearance",
    light: "Light",
    dark: "Dark",
    language: "Language",
    export: "Export",
    exportDescription: "Generates an Excel file (.xlsx) with all your fill-ups, vehicles and stations.",
    downloadExport: "Download Excel export (.xlsx)",
    generating: "Generating...",
    vehicles: "Vehicles",
    stations: "Stations",
    exportError: "Export error: ",

    editFillTitle: "Edit fill-up",
    date: "Date",
    saveChanges: "Save changes",
    totalCost: "Total cost",
    fillsSheet: "Fills",
    editLabel: "Edit",
  },
} as const;

export type TranslationKey = keyof typeof translations.fr;

const LanguageContext = createContext<{
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TranslationKey) => string;
} | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("fr");

  useEffect(() => {
    const stored = localStorage.getItem("lang");
    if (stored === "en" || stored === "fr") setLangState(stored);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    localStorage.setItem("lang", l);
  };

  const t = (key: TranslationKey) => translations[lang][key];

  return <LanguageContext.Provider value={{ lang, setLang, t }}>{children}</LanguageContext.Provider>;
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error("useLanguage must be used within LanguageProvider");
  return ctx;
}
