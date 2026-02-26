import { redirect } from "next/navigation";
import { normalizeLandingLocale } from "../../lib/i18n";
import { getLandingLocale } from "../../lib/server-locale";

type DocsEntryPageProps = {
  searchParams?: {
    lang?: string | string[];
  };
};

function readQueryLang(value: string | string[] | undefined): string | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

export default async function DocsEntryPage(props: DocsEntryPageProps) {
  const queryLang = readQueryLang(props.searchParams?.lang);
  const locale = queryLang ? normalizeLandingLocale(queryLang) : await getLandingLocale();
  redirect(`/openwork?lang=${locale}`);
}
