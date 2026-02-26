import { SiteFooter } from "../../components/site-footer";
import { SiteNav } from "../../components/site-nav";
import { OpenCodeLogo } from "../../components/opencode-logo";
import { getGithubData } from "../../lib/github";
import { pickByLocale } from "../../lib/i18n";
import { getLandingLocale } from "../../lib/server-locale";

export async function generateMetadata() {
  const locale = await getLandingLocale();
  return {
    title: pickByLocale(locale, "OpenWork — Den", "OpenWork — Den 托管服务"),
    description: pickByLocale(
      locale,
      "Hosted sandboxed workers for your team, available in desktop, Slack, and Telegram.",
      "为团队提供托管沙盒 worker，可在桌面端、Slack 和 Telegram 中使用。",
    ),
  };
}

export default async function Den() {
  const github = await getGithubData();
  const locale = await getLandingLocale();
  const txt = (en: string, zh: string) => pickByLocale(locale, en, zh);

  return (
    <div className="min-h-screen">
      <SiteNav stars={github.stars} active="den" locale={locale} />

      <main className="pb-24 pt-20">
        <div className="content-max-width px-6">
          <div className="animate-fade-up">
            <div className="mb-3 text-[12px] font-bold uppercase tracking-wider text-gray-500">
              {txt("OpenWork hosted", "OpenWork 托管")}
            </div>
            <h1 className="mb-3 text-4xl font-bold tracking-tight">Den</h1>
            <h2 className="mb-8 text-[34px] font-bold leading-tight tracking-tight text-black">
              {txt("Hosted sandboxed workers for your team", "为你的团队提供托管沙盒 worker")}
            </h2>
            <p className="max-w-3xl text-[18px] leading-relaxed text-gray-600">
              {txt(
                "Den gives your team hosted sandboxed workers that you can access from our desktop app, Slack, or Telegram. All your skills, agents, and MCP integrations are directly available.",
                "Den 为团队提供托管沙盒 worker，可从桌面端、Slack 或 Telegram 访问；你的技能、Agent 与 MCP 集成都可直接使用。",
              )}
            </p>
          </div>

          <div className="mb-12 mt-10 flex flex-wrap items-center gap-3">
            <a
              href="https://app.openwork.software"
              className="doc-button"
              rel="noreferrer"
              target="_blank"
            >
              {txt("Get started", "立即开始")}
              <svg
                className="h-4 w-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M14 5l7 7m0 0l-7 7m7-7H3"
                />
              </svg>
            </a>
          </div>

          <div className="mb-8 text-[20px] font-semibold text-black">
            {txt("$1 first month, then $50/month per worker. Cancel anytime.", "首月 $1，之后每个 worker 每月 $50，随时可取消。")}
          </div>
          <p className="mb-12 max-w-3xl text-[15px] leading-relaxed text-gray-600">
            {txt(
              "Early adopters get priority onboarding and custom workflow setup through March 1.",
              "早期用户可在 3 月 1 日前享受优先 onboarding 与定制工作流配置服务。",
            )}
          </p>

          <div className="mb-14 grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
            <div className="feature-card">
              <h4 className="mb-2 text-[14px] font-bold">
                {txt("Hosted sandboxed workers", "托管沙盒 worker")}
              </h4>
              <p className="text-[13px] leading-relaxed text-gray-500">
                {txt(
                  "Every worker runs in an isolated environment so your team can automate safely without managing infrastructure.",
                  "每个 worker 都在隔离环境中运行，让团队无需管理基础设施也能安全自动化。",
                )}
              </p>
            </div>
            <div className="feature-card">
              <h4 className="mb-2 text-[14px] font-bold">
                {txt("Desktop, Slack, and Telegram access", "支持桌面端、Slack 与 Telegram 访问")}
              </h4>
              <p className="text-[13px] leading-relaxed text-gray-500">
                {txt(
                  "Run and monitor the same workers from the OpenWork desktop app or directly inside your team chats.",
                  "可在 OpenWork 桌面端或团队聊天中直接运行并监控同一批 worker。",
                )}
              </p>
            </div>
            <div className="feature-card">
              <h4 className="mb-2 text-[14px] font-bold">
                {txt("Skills, agents, and MCP included", "内置 Skills、Agent 与 MCP")}
              </h4>
              <p className="text-[13px] leading-relaxed text-gray-500">
                {txt(
                  "Bring your existing OpenWork setup and everything is available immediately in each hosted worker.",
                  "沿用你现有的 OpenWork 配置，每个托管 worker 可立即可用。",
                )}
              </p>
            </div>
          </div>

          <div className="mb-16 flex flex-wrap items-center gap-2 text-[13px] text-gray-500">
            <span className="font-semibold text-gray-900">{txt("Powered by", "技术支持")}</span>
            <a
              href="https://opencode.ai"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center"
              aria-label="opencode.ai"
            >
              <OpenCodeLogo className="h-3 w-auto" />
            </a>
            <span>{txt("Everything from opencode just works.", "基于 OpenCode 的能力可直接工作。")}</span>
          </div>

          <SiteFooter locale={locale} />
        </div>
      </main>
    </div>
  );
}
