export type LandingLocale = "en" | "zh";

export function normalizeLandingLocale(input: string | null | undefined): LandingLocale {
  if (!input) return "en";
  const value = input.trim().toLowerCase();
  if (!value) return "en";
  if (value.startsWith("zh")) return "zh";
  return "en";
}

export function pickByLocale(locale: LandingLocale, en: string, zh: string): string {
  return locale === "zh" ? zh : en;
}
