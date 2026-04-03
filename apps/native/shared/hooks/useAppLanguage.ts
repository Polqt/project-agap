import { useTranslation } from "react-i18next";

import { type AppLanguage, LANGUAGE_OPTIONS, setAppLanguage } from "@/shared/i18n";

export function useAppLanguage() {
  const { i18n } = useTranslation();

  const currentLanguage = (i18n.language ?? "fil") as AppLanguage;

  const currentOption =
    LANGUAGE_OPTIONS.find((l) => l.code === currentLanguage) ?? LANGUAGE_OPTIONS[1]!;

  async function changeLanguage(lang: AppLanguage) {
    await setAppLanguage(lang);
  }

  return {
    currentLanguage,
    currentOption,
    languageOptions: LANGUAGE_OPTIONS,
    changeLanguage,
  };
}
