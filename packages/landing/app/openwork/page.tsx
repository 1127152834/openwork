import Link from "next/link";
import { SiteFooter } from "../../components/site-footer";
import { SiteNav } from "../../components/site-nav";
import { getGithubData } from "../../lib/github";
import { normalizeLandingLocale, pickByLocale, type LandingLocale } from "../../lib/i18n";
import { getLandingLocale } from "../../lib/server-locale";

type OpenworkDocsPageProps = {
  searchParams?: {
    lang?: string | string[];
  };
};

type LocalizedCard = {
  href: string;
  titleEn: string;
  titleZh: string;
  descEn: string;
  descZh: string;
};

const DOC_SECTIONS: LocalizedCard[] = [
  {
    href: "/docs/get-started",
    titleEn: "Get Started",
    titleZh: "快速开始",
    descEn: "Install OpenWork and complete your first local-first workflow.",
    descZh: "安装 OpenWork 并完成第一条本地优先工作流。",
  },
  {
    href: "/docs/cli",
    titleEn: "CLI Guide",
    titleZh: "CLI 指南",
    descEn: "Run OpenWork in scripts, CI, and automation environments.",
    descZh: "在脚本、CI 和自动化环境中使用 OpenWork。",
  },
  {
    href: "/docs/mcp",
    titleEn: "MCP Integration",
    titleZh: "MCP 集成",
    descEn: "Connect tools, external systems, and enterprise services.",
    descZh: "连接工具、外部系统与企业服务。",
  },
  {
    href: "/docs/development",
    titleEn: "Development",
    titleZh: "开发文档",
    descEn: "Understand architecture and customize OpenWork source code.",
    descZh: "理解架构并定制 OpenWork 源码。",
  },
];

const QUICKSTART_STEPS = [
  {
    en: "Download OpenWork desktop and finish onboarding.",
    zh: "下载 OpenWork 桌面端并完成初始化引导。",
  },
  {
    en: "Connect your model provider and required MCP services.",
    zh: "连接你的模型提供商与所需的 MCP 服务。",
  },
  {
    en: "Create a workspace and run your first multi-agent task.",
    zh: "创建工作区并执行第一条多 Agent 任务。",
  },
] as const;

function resolveQueryLocale(searchParams: OpenworkDocsPageProps["searchParams"]): LandingLocale | null {
  const raw = searchParams?.lang;
  const candidate = Array.isArray(raw) ? raw[0] : raw;
  if (!candidate) return null;
  return normalizeLandingLocale(candidate);
}

function localeLink(lang: LandingLocale) {
  return `/openwork?lang=${lang}`;
}

export async function generateMetadata() {
  const locale = await getLandingLocale();
  return {
    title: pickByLocale(locale, "OpenWork Documentation", "OpenWork 文档中心"),
    description: pickByLocale(
      locale,
      "Bilingual OpenWork docs entry with quick links to guides, CLI, MCP, and development references.",
      "OpenWork 双语文档入口，包含指南、CLI、MCP 与开发参考的快速链接。",
    ),
  };
}

export default async function OpenworkDocsPage(props: OpenworkDocsPageProps) {
  const github = await getGithubData();
  const headerLocale = await getLandingLocale();
  const locale = resolveQueryLocale(props.searchParams) ?? headerLocale;
  const txt = (en: string, zh: string) => pickByLocale(locale, en, zh);

  return (
    <div className="min-h-screen">
      <SiteNav stars={github.stars} locale={locale} />

      <main className="pb-24 pt-20">
        <div className="content-max-width px-6">
          <div className="animate-fade-up">
            <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
              <span className="rounded-full border border-gray-200 bg-white px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-gray-600">
                {txt("Documentation", "文档中心")}
              </span>
              <div className="inline-flex items-center rounded-lg border border-gray-200 bg-white p-1 text-sm shadow-sm">
                <Link
                  href={localeLink("en")}
                  className={`rounded-md px-3 py-1.5 font-medium transition ${
                    locale === "en" ? "bg-black text-white" : "text-gray-700 hover:text-black"
                  }`}
                >
                  English
                </Link>
                <Link
                  href={localeLink("zh")}
                  className={`rounded-md px-3 py-1.5 font-medium transition ${
                    locale === "zh" ? "bg-black text-white" : "text-gray-700 hover:text-black"
                  }`}
                >
                  中文
                </Link>
              </div>
            </div>

            <h1 className="mb-4 max-w-4xl text-4xl font-bold tracking-tight md:text-5xl">
              {txt(
                "OpenWork docs, now with bilingual navigation.",
                "OpenWork 文档入口，支持中英文切换。",
              )}
            </h1>
            <p className="mb-10 max-w-3xl text-[17px] leading-relaxed text-gray-700">
              {txt(
                "Use this page as your language-aware entry point. Switch between English and Chinese, then jump into the exact guide you need.",
                "将这里作为语言感知文档入口。先切换中英文，再进入你需要的具体指南。",
              )}
            </p>
          </div>

          <section className="mb-12 grid grid-cols-1 gap-4 md:grid-cols-2">
            {DOC_SECTIONS.map((section) => (
              <a
                key={section.href}
                href={section.href}
                className="feature-card border-gray-200 bg-white/95 transition hover:border-gray-300"
              >
                <h2 className="mb-2 text-xl font-semibold text-gray-900">
                  {txt(section.titleEn, section.titleZh)}
                </h2>
                <p className="text-[15px] text-gray-700">
                  {txt(section.descEn, section.descZh)}
                </p>
              </a>
            ))}
          </section>

          <section className="mb-12 rounded-2xl border border-gray-200 bg-white/90 p-6">
            <h2 className="mb-4 text-2xl font-bold text-gray-900">
              {txt("3-step quickstart", "三步快速上手")}
            </h2>
            <ol className="space-y-3 text-[15px] text-gray-700">
              {QUICKSTART_STEPS.map((step, index) => (
                <li key={step.en} className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-800">
                    {index + 1}
                  </span>
                  <span>{txt(step.en, step.zh)}</span>
                </li>
              ))}
            </ol>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <a href="/download" className="doc-button">
                {txt("Download OpenWork", "下载 OpenWork")}
              </a>
              <a
                href="/docs/get-started"
                className="rounded-md border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-800 transition hover:border-gray-500 hover:text-black"
              >
                {txt("Open Get Started guide", "打开快速开始指南")}
              </a>
            </div>
          </section>

          <section className="rounded-2xl border border-amber-200 bg-amber-50/70 p-6 text-[14px] text-amber-900">
            <h2 className="mb-2 text-lg font-semibold">
              {txt("Language coverage note", "语言覆盖说明")}
            </h2>
            <p>
              {txt(
                "This entry page is fully bilingual. Some deep reference pages are mirrored from upstream docs and may still be English-first.",
                "该入口页已完整支持中英文切换。部分深层参考页来自上游文档镜像，当前仍可能以英文为主。",
              )}
            </p>
          </section>

          <SiteFooter locale={locale} />
        </div>
      </main>
    </div>
  );
}
