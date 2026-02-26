import { SiteFooter } from "../components/site-footer";
import { SiteNav } from "../components/site-nav";
import { OpenCodeLogo } from "../components/opencode-logo";
import { PaperMeshBackground } from "../components/paper-mesh-background";
import { WaitlistForm } from "../components/waitlist-form";
import { getGithubData } from "../lib/github";
import { pickByLocale } from "../lib/i18n";
import { getLandingLocale } from "../lib/server-locale";

export default async function Home() {
  const github = await getGithubData();
  const cal = process.env.NEXT_PUBLIC_CAL_URL ?? "";
  const locale = await getLandingLocale();
  const txt = (en: string, zh: string) => pickByLocale(locale, en, zh);
  return (
    <div className="relative min-h-screen">
      <div
        className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
        aria-hidden
        style={{
          WebkitMaskImage:
            "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 100%)",
          maskImage:
            "linear-gradient(to bottom, rgba(0,0,0,1) 0%, rgba(0,0,0,1) 40%, rgba(0,0,0,0) 100%)"
        }}
      >
        <PaperMeshBackground opacity={0.4} />
      </div>

      <div className="relative z-10">
        <SiteNav stars={github.stars} callUrl={cal} locale={locale} />

        <main className="pb-24 pt-20">
          <div className="content-max-width px-6">
          <div className="animate-fade-up">
            <h1 className="mb-4 max-w-4xl text-5xl font-bold tracking-tight md:text-6xl">
              {txt("OpenWork is the team layer for your existing agent setup.", "OpenWork 是你现有 Agent 体系的团队协作层。")}
            </h1>
            <p className="mb-10 max-w-4xl text-xl font-medium leading-relaxed text-gray-900/80">
              {txt(
                "Whether you're using Claude Code, Codex, OpenCode, or your own stack, OpenWork turns it into a shareable desktop app your non-technical coworkers can use.",
                "无论你使用 Claude Code、Codex、OpenCode 还是自建技术栈，OpenWork 都能把它变成可共享的桌面应用，让非技术同事也能使用。",
              )}
            </p>
          </div>

          <div className="mb-10 flex flex-wrap items-center gap-3">
            <a
              href={github.downloads.macos}
              className="doc-button"
              rel="noreferrer"
              target="_blank"
            >
              {txt("Download for macOS", "下载 macOS 版")}
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
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                />
              </svg>
            </a>
            <div className="ml-2 flex gap-4">
              <a
                href="/download#windows"
                className="text-[15px] font-medium text-gray-900/60 transition hover:text-gray-900"
              >
                Windows <span className="alpha-tag ml-1 border-gray-900/10 text-gray-900/60">{txt("Alpha", "内测")}</span>
              </a>
              <a
                href="/download#linux"
                className="text-[15px] font-medium text-gray-900/60 transition hover:text-gray-900"
              >
                Linux <span className="alpha-tag ml-1 border-gray-900/10 text-gray-900/60">{txt("Alpha", "内测")}</span>
              </a>
            </div>
          </div>

          <div className="group relative mb-2 mt-8">
            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-2xl transition-transform duration-500 group-hover:scale-[1.01] ring-1 ring-black/5">
              <video
                autoPlay
                loop
                muted
                playsInline
                className="w-full block"
              >
                <source src="/app-demo.mp4" type="video/mp4" />
              </video>
            </div>
          </div>

          <div className="mb-16 flex flex-wrap items-center gap-2 text-[14px] text-gray-700">
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
          </div>

          <section id="install">
            <h2 className="mb-6 text-2xl font-bold md:text-3xl">{txt("Getting started", "快速开始")}</h2>
            <p className="mb-8 text-base text-gray-700">
              {txt("The OpenWork app is available on macOS, Windows, and Linux.", "OpenWork 支持 macOS、Windows 和 Linux。")}
            </p>

            <div className="space-y-12">
              <div className="flex gap-6">
                <div className="step-circle shrink-0">1</div>
                <div className="space-y-4">
                  <h3 className="text-base font-bold">
                    {txt("Download and install the OpenWork app", "下载并安装 OpenWork 应用")}
                  </h3>
                  <p className="text-[15px] text-gray-700">
                    {txt("Stable release for macOS. Windows and Linux builds are available in alpha.", "macOS 提供稳定版，Windows 和 Linux 提供内测版。")}
                  </p>
                  <div className="flex flex-wrap items-center gap-3">
                    <a
                      href={github.downloads.macos}
                      className="doc-button"
                      rel="noreferrer"
                      target="_blank"
                    >
                      {txt("Download for macOS", "下载 macOS 版")}
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
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                      </svg>
                    </a>
                    <div className="ml-2 flex gap-4">
                      <a
                        href="/download#windows"
                        className="text-[15px] text-gray-700 transition hover:text-black"
                      >
                        Windows <span className="alpha-tag ml-1">{txt("Alpha", "内测")}</span>
                      </a>
                      <a
                        href="/download#linux"
                        className="text-[15px] text-gray-700 transition hover:text-black"
                      >
                        Linux <span className="alpha-tag ml-1">{txt("Alpha", "内测")}</span>
                      </a>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-6">
                <div className="step-circle shrink-0">2</div>
                <div className="w-full space-y-4">
                  <h3 className="text-base font-bold">{txt("Send your first message", "发送第一条消息")}</h3>
                  <p className="text-[15px] text-gray-700">
                    {txt(
                      "Start instantly. No registration is required to begin using basic models on your machine. Try these examples:",
                      "可立即开始，无需注册即可在本机使用基础模型。可以试试这些示例：",
                    )}
                  </p>

                  <div className="grid grid-cols-1 gap-4 pt-4 sm:grid-cols-3">
                    <div className="flex flex-col gap-3 rounded-xl border border-sky-100 bg-white/90 p-4 shadow-sm ring-1 ring-sky-100/50">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-sky-50 text-sky-700 shadow-sm">
                        <svg
                          viewBox="0 0 64 64"
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          aria-hidden="true"
                        >
                          <rect x="10" y="26" width="44" height="18" rx="4" />
                          <rect x="14" y="18" width="12" height="10" rx="3" />
                          <rect x="38" y="18" width="12" height="10" rx="3" />
                          <path d="M16 44v6" />
                          <path d="M48 44v6" />
                        </svg>
                      </span>
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-sky-700">
                        {txt("Browser task", "浏览器任务")}
                      </span>
                      <p className="text-[14px] font-medium leading-relaxed text-gray-900">
                        "Open Chrome and find me a green couch on Facebook
                        Marketplace."
                      </p>
                    </div>
                    <div className="flex flex-col gap-3 rounded-xl border border-violet-100 bg-white/90 p-4 shadow-sm ring-1 ring-violet-100/50">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-violet-50 text-violet-700 shadow-sm">
                        <svg
                          viewBox="0 0 64 64"
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          aria-hidden="true"
                        >
                          <path d="M10 44h44" />
                          <path d="M16 38l10-18 12 14 10-20" />
                          <circle cx="26" cy="20" r="3" />
                          <circle cx="38" cy="34" r="3" />
                        </svg>
                      </span>
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-violet-700">
                        {txt("Notion update", "Notion 更新")}
                      </span>
                      <p className="text-[14px] font-medium leading-relaxed text-gray-900">
                        "Go on Notion and update this CRM entry for me."
                      </p>
                    </div>
                    <div className="flex flex-col gap-3 rounded-xl border border-emerald-100 bg-white/90 p-4 shadow-sm ring-1 ring-emerald-100/50">
                      <span className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700 shadow-sm">
                        <svg
                          viewBox="0 0 64 64"
                          className="h-4 w-4"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="3"
                          aria-hidden="true"
                        >
                          <rect x="16" y="14" width="32" height="36" rx="4" />
                          <path d="M22 24h20" />
                          <path d="M22 32h20" />
                          <path d="M22 40h14" />
                        </svg>
                      </span>
                      <span className="text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                        {txt("CRM action", "CRM 操作")}
                      </span>
                      <p className="text-[14px] font-medium leading-relaxed text-gray-900">
                        "Update the CRM with this information."
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <hr />

          <section id="capabilities" className="py-12">
            <h2 className="mb-10 text-2xl font-bold md:text-3xl">{txt("Work with the OpenWork app", "用 OpenWork 应用完成工作")}</h2>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
              <div className="feature-card border-sky-100 bg-white/90 ring-1 ring-sky-100/60">
                <span className="mb-3 inline-flex rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-sky-700">
                  {txt("Productivity", "效率")}
                </span>
                <h4 className="mb-2 text-[15px] font-bold">
                  {txt("Multitask across projects", "跨项目并行处理")}
                </h4>
                <p className="text-[15px] leading-relaxed text-gray-700">
                  {txt(
                    "Run multiple independent threads in parallel and switch context instantly between browser tasks and local file work.",
                    "并行运行多个独立任务线程，在浏览器任务与本地文件工作之间快速切换上下文。",
                  )}
                </p>
              </div>
              <div className="feature-card border-violet-100 bg-white/90 ring-1 ring-violet-100/60">
                <span className="mb-3 inline-flex rounded-full bg-violet-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-violet-700">
                  {txt("Automation", "自动化")}
                </span>
                <h4 className="mb-2 text-[15px] font-bold">{txt("Automations", "自动化任务")}</h4>
                <p className="text-[15px] leading-relaxed text-gray-700">
                  {txt(
                    "Run any prompt on a schedule or trigger it automatically. Set it once and let it handle itself.",
                    "将任意提示词设为定时任务或自动触发，配置一次即可持续运行。",
                  )}
                </p>
              </div>
              <div className="feature-card border-emerald-100 bg-white/90 ring-1 ring-emerald-100/60">
                <span className="mb-3 inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                  {txt("Reuse", "复用")}
                </span>
                <h4 className="mb-2 text-[15px] font-bold">{txt("Skills support", "技能支持")}</h4>
                <p className="text-[15px] leading-relaxed text-gray-700">
                  {txt(
                    "Turn any complex workflow into a reusable skill. Share them with your team so they can run automations with one click.",
                    "把复杂流程沉淀成可复用技能，并分享给团队，让同事一键运行自动化。",
                  )}
                </p>
              </div>
              <div className="feature-card border-amber-100 bg-white/90 ring-1 ring-amber-100/60">
                <span className="mb-3 inline-flex rounded-full bg-amber-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                  {txt("Collaboration", "协作")}
                </span>
                <h4 className="mb-2 text-[15px] font-bold">{txt("Slack-native agents", "Slack 原生 Agent")}</h4>
                <p className="text-[15px] leading-relaxed text-gray-700">
                  {txt(
                    "Bring OpenWork into Slack threads. Mention the agent, watch progress stream in real time, and keep the whole team in the loop.",
                    "把 OpenWork 带进 Slack 讨论串，@agent 即可实时查看进度，让团队保持同步。",
                  )}
                </p>
              </div>
            </div>
          </section>

          <hr />

          <section id="cloud" className="py-12">
            <h2 className="mb-2 text-2xl font-bold md:text-3xl">
              {txt("Automate your entire company, safely", "安全地自动化你的整个团队")}
            </h2>
            <p className="mb-8 text-base leading-relaxed text-gray-700">
              {txt(
                "OpenWork Cloud runs your automations so you don't have to manage infrastructure. Give every team secure access to the workflows they need, with clear controls and zero ops overhead.",
                "OpenWork Cloud 托管并运行自动化流程，无需你维护基础设施。为每个团队提供安全可控的工作流访问能力，零运维负担。",
              )}
            </p>

            <div className="mb-10 grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3">
              <div className="feature-card border-blue-100 bg-blue-50/50">
                <span className="mb-3 inline-flex rounded-full border border-blue-200 bg-white px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-blue-700">
                  {txt("Team ready", "团队就绪")}
                </span>
                <h4 className="mb-2 text-[15px] font-bold">
                  {txt("Hosted for your team", "面向团队的托管部署")}
                </h4>
                <p className="text-[15px] leading-relaxed text-gray-700">
                  {txt(
                    "No servers to maintain. We handle the infrastructure so your team can focus on the work.",
                    "无需维护服务器。基础设施由我们负责，你的团队只需专注业务本身。",
                  )}
                </p>
              </div>
              <div className="feature-card border-emerald-100 bg-emerald-50/50">
                <span className="mb-3 inline-flex rounded-full border border-emerald-200 bg-white px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-emerald-700">
                  {txt("Safe by default", "默认安全")}
                </span>
                <h4 className="mb-2 text-[15px] font-bold">
                  {txt("Permissioned & auditable", "权限可控且可审计")}
                </h4>
                <p className="text-[15px] leading-relaxed text-gray-700">
                  {txt(
                    "Every agent action is logged. Set clear boundaries for what agents can and cannot do.",
                    "每次 Agent 操作都会记录。你可以明确限制 Agent 的能力边界。",
                  )}
                </p>
              </div>
              <div className="feature-card border-amber-100 bg-amber-50/50">
                <span className="mb-3 inline-flex rounded-full border border-amber-200 bg-white px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-700">
                  {txt("Practical onboarding", "实用上手")}
                </span>
                <h4 className="mb-2 text-[15px] font-bold">
                  {txt("Free automation series", "免费自动化系列")}
                </h4>
                <p className="text-[15px] leading-relaxed text-gray-700">
                  {txt(
                    "Step-by-step guides on safely automating ops, sales, support, and more. Delivered to your inbox.",
                    "提供覆盖运营、销售、支持等场景的安全自动化实操指南，按期发送到你的邮箱。",
                  )}
                </p>
              </div>
            </div>

            <div className="mb-6">
              <a href="/den" className="doc-button">
                {txt("Explore den", "了解 Den")}
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
          </section>

          <hr />

          <section id="faq" className="py-12">
            <h2 className="mb-10 text-2xl font-bold md:text-3xl">FAQ</h2>
            <div className="space-y-12">
              <div>
                <h4 className="mb-2 text-[15px] font-bold">
                  {txt("What's the difference between OpenWork and regular chat?", "OpenWork 和普通聊天产品有什么区别？")}
                </h4>
                <p className="text-[15px] leading-relaxed text-gray-700">
                  {txt(
                    "Regular chat gives you text answers. OpenWork can perform actions like creating files, editing folders, and running browser commands on your local machine, after you approve them.",
                    "普通聊天只会回复文本。OpenWork 在你授权后可在本机执行真实操作，例如创建文件、编辑目录、运行浏览器命令。",
                  )}
                </p>
              </div>
              <div>
                <h4 className="mb-2 text-[15px] font-bold">{txt("Is it free?", "免费吗？")}</h4>
                <p className="text-[15px] leading-relaxed text-gray-700">
                  {txt(
                    "Yes. OpenWork is open source. You can download and use it for free using free models on your machine. You only pay for API usage if you choose to connect paid cloud models.",
                    "是的。OpenWork 是开源软件。你可以免费下载并在本机使用免费模型；只有连接付费云模型时才会产生 API 费用。",
                  )}
                </p>
              </div>
              <div>
                <h4 className="mb-2 text-[15px] font-bold">
                  {txt("Can I share automations with my team?", "我可以和团队共享自动化流程吗？")}
                </h4>
                <p className="text-[15px] leading-relaxed text-gray-700">
                  {txt(
                    "Yes. Package any workflow as a skill and share it. Your coworkers can install and run it on their own machines instantly.",
                    "可以。你可以把任意工作流封装为 Skill 并共享，同事可在各自机器上立即安装并运行。",
                  )}
                </p>
              </div>
              <div>
                <h4 className="mb-2 text-[15px] font-bold">{txt("Is it safe?", "安全吗？")}</h4>
                <p className="text-[15px] leading-relaxed text-gray-700">
                  {txt(
                    "OpenWork runs locally. It cannot access files or run commands without your permission. You see a clear plan before any action is taken.",
                    "OpenWork 本地运行，未经授权不会访问文件或执行命令。任何动作前都会先展示清晰执行计划。",
                  )}
                </p>
              </div>
              <div>
                <h4 className="mb-2 text-[15px] font-bold">
                  {txt("Can I use it with Slack, Telegram, or WhatsApp?", "能和 Slack、Telegram 或 WhatsApp 配合使用吗？")}
                </h4>
                <p className="text-[15px] leading-relaxed text-gray-700">
                  {txt(
                    "Yes. Once it is running somewhere, you can keep requests flowing from Slack, Telegram, or WhatsApp and let OpenWork carry them out.",
                    "可以。只要服务在某处运行，你就能持续从 Slack、Telegram 或 WhatsApp 发起请求并由 OpenWork 执行。",
                  )}
                </p>
              </div>
            </div>
          </section>

          <hr />

          <section id="compatibility" className="py-12">
            <h2 className="mb-3 text-2xl font-bold md:text-3xl">{txt("Compatibility", "兼容性")}</h2>
            <p className="mb-8 text-base leading-relaxed text-gray-700">
              {txt(
                "OpenWork connects to your existing setup so you can ship team-ready workflows without rebuilding from scratch.",
                "OpenWork 可接入你现有体系，让你无需推倒重来即可交付团队可用工作流。",
              )}
            </p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="feature-card flex items-center justify-between gap-4 bg-white/80">
                <h4 className="text-[15px] font-semibold text-gray-900">Claude Code</h4>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[12px] font-semibold text-emerald-700">
                  {txt("Full compatibility", "完全兼容")}
                </span>
              </div>

              <div className="feature-card flex items-center justify-between gap-4 bg-white/80">
                <h4 className="text-[15px] font-semibold text-gray-900">OpenCode</h4>
                <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[12px] font-semibold text-emerald-700">
                  {txt("Full compatibility", "完全兼容")}
                </span>
              </div>

              <div className="feature-card flex items-center justify-between gap-4 bg-white/80">
                <h4 className="text-[15px] font-semibold text-gray-900">Codex</h4>
                <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[12px] font-semibold text-amber-700">
                  {txt("Partial compatibility", "部分兼容")}
                </span>
              </div>

              <div className="feature-card flex items-center justify-between gap-4 bg-white/80">
                <h4 className="text-[15px] font-semibold text-gray-900">PI</h4>
                <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[12px] font-semibold text-amber-700">
                  {txt("Partial compatibility", "部分兼容")}
                </span>
              </div>
            </div>
          </section>

          <section id="updates" className="pb-8 pt-6">
            <div className="rounded-2xl border border-white/70 bg-white/70 p-6 shadow-lg backdrop-blur-sm">
              <h3 className="mb-2 text-xl font-semibold tracking-tight text-gray-900">
                {txt("Keep me in the loop", "订阅更新")}
              </h3>
              <p className="mb-4 max-w-2xl text-[15px] leading-relaxed text-gray-700">
                {txt(
                  "Get occasional product updates and practical automation guides. No spam, just useful drops.",
                  "接收产品更新和实用自动化指南。无垃圾邮件，只发有价值内容。",
                )}
              </p>
            <WaitlistForm locale={locale} />
            </div>
          </section>

          <SiteFooter locale={locale} />
          </div>
        </main>
      </div>
    </div>
  );
}
