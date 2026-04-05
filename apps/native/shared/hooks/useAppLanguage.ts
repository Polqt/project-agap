import { useTranslation } from "react-i18next";

import { type AppLanguage, LANGUAGE_OPTIONS, setAppLanguage } from "@/shared/i18n";

export function useAppLanguage() {
  // useTranslation subscribes this hook to language changes —
  // any component using this hook re-renders when language switches.
  const { i18n } = useTranslation();

  const currentLanguage = (i18n.language ?? "fil") as AppLanguage;

  const currentOption =
    LANGUAGE_OPTIONS.find((l) => l.code === currentLanguage) ?? LANGUAGE_OPTIONS[1]!;

  async function changeLanguage(lang: AppLanguage) {
    await setAppLanguage(lang);
    // i18next broadcasts the languageChanged event which react-i18next
    // picks up globally — all components using useTranslation() re-render.
  }

  return {
    currentLanguage,
    currentOption,
    languageOptions: LANGUAGE_OPTIONS,
    changeLanguage,
  };
}
