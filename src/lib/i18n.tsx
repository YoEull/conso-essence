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
    price: "Prix",
    volume: "Volume",
    odometer: "Compteur",
    exPrefix: "Ex:",
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
    totalCost: "Coût total",
    fillsSheet: "Pleins",
    editLabel: "Modifier",

    unitsTitle: "Unités",
    unit: "Unité",
    distance: "Distance",
    currency: "Devise",

    emailPlaceholder: "Adresse email",
    sendMagicLink: "Recevoir un lien de connexion",
    sending: "Envoi...",
    magicLinkSent: "Lien envoyé ! Vérifiez votre boîte mail et cliquez sur le lien pour vous connecter.",
    signOut: "Se déconnecter",
    profileTitle: "Profil",
    displayNamePlaceholder: "Votre pseudo",
    save: "Enregistrer",
    saved: "Enregistré",
    groupTitle: "Groupe",
    groupMembers: "Membres",
    inviteByEmail: "Inviter par email",
    invite: "Inviter",
    inviting: "Invitation...",
    pending: "en attente",
    you: "vous",
    owner: "propriétaire",
    inviteError: "Erreur d'invitation : ",
    leaveGroup: "Quitter le groupe",
    confirmLeaveGroup: "Confirmer que vous voulez quitter ce groupe ?",
    deleteLabel: "Supprimer",
    confirmDeleteItem: "Supprimer ?",
    deleteBlockedFk: "Impossible de supprimer : des pleins existent pour cet élément.",
    createGroup: "Créer un groupe",
    groupNamePlaceholder: "Nom du groupe",
    create: "Créer",
    deleteGroupLabel: "Supprimer le groupe",
    confirmDeleteGroup: "Supprimer ce groupe ? Cela retirera tous ses membres.",
    deleteBlockedGroupFk: "Impossible de supprimer : ce groupe contient encore des véhicules ou des stations.",
    hideLabel: "Masquer",
    unhideLabel: "Afficher",
    hiddenBadge: "masqué",
    addVehiclePlaceholder: "Ajouter un véhicule",
    addStationPlaceholder: "Ajouter une station",
    selectVehicleFirst: "Sélectionnez d'abord un véhicule.",
  },
  en: {
    appTitle: "Fuel Tracker",
    navNewFill: "New fill-up",
    navHistory: "History",
    navSettings: "Settings",
    menu: "Menu",

    vehicle: "Vehicle",
    station: "Station",
    price: "Price",
    volume: "Volume",
    odometer: "Odometer",
    exPrefix: "E.g.",
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

    unitsTitle: "Units",
    unit: "Unit",
    distance: "Distance",
    currency: "Currency",

    emailPlaceholder: "Email address",
    sendMagicLink: "Send login link",
    sending: "Sending...",
    magicLinkSent: "Link sent! Check your inbox and click the link to sign in.",
    signOut: "Sign out",
    profileTitle: "Profile",
    displayNamePlaceholder: "Your display name",
    save: "Save",
    saved: "Saved",
    groupTitle: "Group",
    groupMembers: "Members",
    inviteByEmail: "Invite by email",
    invite: "Invite",
    inviting: "Inviting...",
    pending: "pending",
    you: "you",
    owner: "owner",
    inviteError: "Invite error: ",
    leaveGroup: "Leave group",
    confirmLeaveGroup: "Confirm you want to leave this group?",
    deleteLabel: "Delete",
    confirmDeleteItem: "Delete?",
    deleteBlockedFk: "Can't delete: fill-ups still reference this item.",
    createGroup: "Create a group",
    groupNamePlaceholder: "Group name",
    create: "Create",
    deleteGroupLabel: "Delete group",
    confirmDeleteGroup: "Delete this group? This will remove all its members.",
    deleteBlockedGroupFk: "Can't delete: this group still has vehicles or stations in it.",
    hideLabel: "Hide",
    unhideLabel: "Show",
    hiddenBadge: "hidden",
    addVehiclePlaceholder: "Add a vehicle",
    addStationPlaceholder: "Add a station",
    selectVehicleFirst: "Select a vehicle first.",
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
