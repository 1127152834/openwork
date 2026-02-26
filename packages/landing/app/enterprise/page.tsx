import { SiteFooter } from "../../components/site-footer";
import { SiteNav } from "../../components/site-nav";
import { BookCallForm } from "../../components/book-call-form";
import { OpenCodeLogo } from "../../components/opencode-logo";
import { getGithubData } from "../../lib/github";
import { pickByLocale } from "../../lib/i18n";
import { getLandingLocale } from "../../lib/server-locale";

export async function generateMetadata() {
  const locale = await getLandingLocale();
  return {
    title: pickByLocale(locale, "OpenWork — Enterprise", "OpenWork — 企业版"),
    description: pickByLocale(
      locale,
      "Secure hosting for safe, permissioned AI employees.",
      "面向安全、权限可控 AI 员工的托管部署方案。",
    ),
  };
}

export default async function Enterprise() {
  const github = await getGithubData();
  const cal = process.env.NEXT_PUBLIC_CAL_URL ?? "";
  const locale = await getLandingLocale();
  const txt = (en: string, zh: string) => pickByLocale(locale, en, zh);

  return (
    <div className="min-h-screen">
      <SiteNav stars={github.stars} callUrl={cal} active="enterprise" locale={locale} />

      <main className="pb-24 pt-20">
        <div className="content-max-width px-6">
          <div className="animate-fade-up">
            <div className="mb-3 text-[12px] font-bold uppercase tracking-wider text-gray-500">
              {txt("We help people host securely", "我们帮助团队安全托管")}
            </div>
            <h1 className="mb-10 text-4xl font-bold tracking-tight">
              {txt("Create safe, permissioned AI employees.", "构建安全、权限可控的 AI 员工。")}
            </h1>
          </div>

          <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
            <div className="space-y-4 text-[15px] leading-relaxed text-gray-700">
              <p>
                {txt(
                  "OpenWork runs local-first. We help you deploy it in a way that matches your security posture, with clear permissions and reliable guardrails.",
                  "OpenWork 采用本地优先架构。我们帮助你按安全合规要求完成部署，提供清晰权限边界与稳定防护。",
                )}
              </p>
              <p>
                {txt(
                  "The goal is simple: agents that can do real work, but only within the boundaries you define.",
                  "目标很简单：让 Agent 真正创造价值，同时严格运行在你定义的边界内。",
                )}
              </p>

              <div className="flex items-center justify-between gap-4 rounded-xl border border-gray-100 bg-white px-5 py-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <OpenCodeLogo className="h-3 w-auto" />
                  <div>
                    <div className="text-[12px] font-bold uppercase tracking-wider text-gray-500">
                      {txt("Built on OpenCode", "基于 OpenCode")}
                    </div>
                    <div className="text-[13px] text-gray-600">
                      {txt("Compatible with OpenCode tooling.", "兼容 OpenCode 工具链。")}
                    </div>
                  </div>
                </div>
                <a
                  href="https://opencode.ai"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[13px] font-semibold text-gray-500 transition hover:text-black"
                >
                  opencode.ai
                </a>
              </div>

              <div className="rounded-xl border border-gray-100 bg-gray-50 p-6">
                <div className="mb-3 text-[12px] font-bold uppercase tracking-wider text-gray-500">
                  {txt("What we focus on", "重点能力")}
                </div>
                <div className="grid grid-cols-1 gap-2 text-[13px] text-gray-600 sm:grid-cols-2">
                  <div>{txt("Secure hosting", "安全托管")}</div>
                  <div>{txt("Permissioned tools", "权限可控工具")}</div>
                  <div>{txt("Auditability", "可审计性")}</div>
                  <div>{txt("Team rollout", "团队上线")}</div>
                </div>
              </div>

              <div className="rounded-xl border border-gray-100 bg-white p-6 shadow-sm">
                <div className="mb-2 text-[12px] font-bold uppercase tracking-wider text-gray-500">
                  {txt("New", "新功能")}
                </div>
                <h3 className="mb-2 text-[18px] font-bold">{txt("Den preorder", "Den 预订")}</h3>
                <p className="mb-4 text-[13px] leading-relaxed text-gray-600">
                  {txt(
                    "$1 first month, then $50/month per worker. Cancel anytime. Includes priority onboarding and custom workflows.",
                    "首月 $1，之后每个 worker 每月 $50，随时可取消。包含优先 onboarding 与定制工作流。",
                  )}
                </p>
                <a href="/den" className="doc-button">
                  {txt("View Den", "查看 Den")}
                </a>
              </div>
            </div>

            <BookCallForm calUrl={cal} locale={locale} />
          </div>

          <SiteFooter locale={locale} />
        </div>
      </main>
    </div>
  );
}
