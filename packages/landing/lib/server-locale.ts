import { headers } from "next/headers";
import { normalizeLandingLocale, type LandingLocale } from "./i18n";

export async function getLandingLocale(): Promise<LandingLocale> {
  const requestHeaders = await headers();
  const acceptLanguage = requestHeaders.get("accept-language");
  return normalizeLandingLocale(acceptLanguage ?? process.env.OPENWORK_LANG);
}
