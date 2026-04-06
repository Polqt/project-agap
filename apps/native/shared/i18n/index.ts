import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Localization from "expo-localization";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import ceb from "./locales/ceb";
import en from "./locales/en";
import fil from "./locales/fil";
import hil from "./locales/hil";
import krj from "./locales/krj";

export type AppLanguage = "en" | "fil" | "hil" | "ceb" | "krj";

export const LANGUAGE_STORAGE_KEY = "agap:app-language";

export const LANGUAGE_OPTIONS: { code: AppLanguage; label: string; nativeLabel: string }[] = [
  { code: "en", label: "English", nativeLabel: "English" },
  { code: "fil", label: "Filipino", nativeLabel: "Filipino" },
  { code: "hil", label: "Hiligaynon", nativeLabel: "Hiligaynon (Ilonggo)" },
  { code: "ceb", label: "Bisaya", nativeLabel: "Bisaya (Cebuano)" },
  { code: "krj", label: "Kinaray-a", nativeLabel: "Kinaray-a" },
];

/** Detect a supported language from device locale tags, fallback to "fil". */
function detectDeviceLanguage(): AppLanguage {
  const locales = Localization.getLocales();
  for (const locale of locales) {
    const tag = locale.languageTag.toLowerCase();
    if (tag.startsWith("en")) return "en";
    if (tag.startsWith("fil") || tag.startsWith("tl")) return "fil";
    if (tag.startsWith("hil")) return "hil";
    if (tag.startsWith("ceb")) return "ceb";
    if (tag.startsWith("krj")) return "krj";
  }
  return "fil";
}

// Keep a promise so loadPersistedLanguage() can await init completion
const i18nReady: Promise<void> = i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      fil: { translation: fil },
      hil: { translation: hil },
      ceb: { translation: ceb },
      krj: { translation: krj },
    },
    lng: detectDeviceLanguage(),
    fallbackLng: "fil",
    interpolation: { escapeValue: false },
    compatibilityJSON: "v4",
  })
  .then(() => undefined);

/** Load persisted language preference from AsyncStorage. Call once on app boot. */
export async function loadPersistedLanguage() {
  try {
    // Wait for i18n to finish initialising before changing language
    await i18nReady;
    const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored && ["en", "fil", "hil", "ceb", "krj"].includes(stored)) {
      await i18n.changeLanguage(stored);
    }
  } catch {
    // ignore — use detected default
  }
}

/** Persist and switch the active language. */
export async function setAppLanguage(lang: AppLanguage) {
  await i18nReady;
  await i18n.changeLanguage(lang);
  await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lang);
}

export { i18n };
export default i18n;
