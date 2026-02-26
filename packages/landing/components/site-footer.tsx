import Link from "next/link";
import { pickByLocale, type LandingLocale } from "../lib/i18n";

type Props = {
  locale?: LandingLocale;
};

export function SiteFooter(props: Props) {
  const locale = props.locale ?? "en";
  const txt = (en: string, zh: string) => pickByLocale(locale, en, zh);
  return (
    <footer className="mt-12 flex flex-col items-center justify-between gap-6 border-t border-gray-100 pb-12 pt-24 text-[14px] text-gray-600 md:flex-row">
      <div className="flex gap-6">
        <Link href="#" className="transition hover:text-black">
          {txt("Safety guide", "安全指南")}
        </Link>
        <Link href="#" className="transition hover:text-black">
          {txt("Terms", "条款")}
        </Link>
        <Link href="#" className="transition hover:text-black">
          {txt("Privacy", "隐私")}
        </Link>
      </div>
      <span>{txt("© 2026 OpenWork Project.", "© 2026 OpenWork 项目。")}</span>
    </footer>
  );
}
