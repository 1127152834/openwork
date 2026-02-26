import { SiteFooter } from "../../components/site-footer";
import { SiteNav } from "../../components/site-nav";
import { getGithubData } from "../../lib/github";
import { pickByLocale } from "../../lib/i18n";
import { getLandingLocale } from "../../lib/server-locale";

export async function generateMetadata() {
  const locale = await getLandingLocale();
  return {
    title: pickByLocale(locale, "OpenWork - Download", "OpenWork - 下载"),
    description: pickByLocale(
      locale,
      "Download OpenWork desktop for macOS, Windows, and Linux. Includes AUR install instructions and direct package downloads.",
      "下载 OpenWork 桌面端（macOS、Windows、Linux），包含 AUR 安装说明与各平台安装包直链。",
    ),
  };
}

export default async function Download() {
  const github = await getGithubData();
  const locale = await getLandingLocale();
  const txt = (en: string, zh: string) => pickByLocale(locale, en, zh);
  const releaseLabel = github.releaseTag || "latest";
  const releaseUrl = github.releaseUrl;

  return (
    <div className="min-h-screen">
      <SiteNav stars={github.stars} active="download" locale={locale} />

      <main className="pb-24 pt-20">
        <div className="content-max-width px-6">
          <div className="animate-fade-up">
            <div className="mb-3 text-[12px] font-bold uppercase tracking-wider text-gray-500">
              {txt("OpenWork desktop", "OpenWork 桌面端")}
            </div>
            <h1 className="mb-4 text-4xl font-bold tracking-tight md:text-5xl">
              {txt("Download OpenWork", "下载 OpenWork")}
            </h1>
            <p className="mb-4 max-w-3xl text-[17px] leading-relaxed text-gray-700">
              {txt(
                "Install OpenWork on macOS, Windows, or Linux. Pick the package that matches your distro and architecture.",
                "在 macOS、Windows 或 Linux 上安装 OpenWork。请选择与你的发行版和架构匹配的安装包。",
              )}
            </p>
            <p className="mb-10 text-[14px] text-gray-600">
              {txt("Latest stable release: ", "最新稳定版本：")}
              <a
                href={releaseUrl}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-gray-900 underline decoration-gray-300 underline-offset-4 transition hover:decoration-gray-700"
              >
                {releaseLabel}
              </a>
            </p>
          </div>

          <div className="mb-10 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <a
              href="#macos"
              className="feature-card border-sky-100 bg-sky-50/60 transition hover:border-sky-200"
            >
              <h2 className="mb-2 text-[16px] font-semibold text-gray-900">macOS</h2>
              <p className="text-[14px] text-gray-700">{txt("Apple Silicon and Intel builds", "Apple Silicon 与 Intel 构建")}</p>
            </a>
            <a
              href="#windows"
              className="feature-card border-violet-100 bg-violet-50/50 transition hover:border-violet-200"
            >
              <h2 className="mb-2 text-[16px] font-semibold text-gray-900">Windows</h2>
              <p className="text-[14px] text-gray-700">{txt("x64 MSI installer", "x64 MSI 安装器")}</p>
            </a>
            <a
              href="#linux"
              className="feature-card border-emerald-100 bg-emerald-50/60 transition hover:border-emerald-200"
            >
              <h2 className="mb-2 text-[16px] font-semibold text-gray-900">Linux</h2>
              <p className="text-[14px] text-gray-700">{txt("AUR, .deb, and .rpm options", "支持 AUR、.deb 与 .rpm")}</p>
            </a>
          </div>

          <section id="macos" className="py-6">
            <h2 className="mb-2 text-2xl font-bold md:text-3xl">macOS</h2>
            <p className="mb-8 text-[15px] text-gray-700">
              {txt("Download the DMG that matches your Mac.", "下载与你 Mac 机型匹配的 DMG 安装包。")}
            </p>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="feature-card bg-white/90">
                <h3 className="mb-2 text-[16px] font-semibold text-gray-900">Apple Silicon (M-series)</h3>
                <p className="mb-4 text-[14px] text-gray-600">{txt("Recommended for M1, M2, M3, and M4 chips.", "推荐用于 M1、M2、M3、M4 芯片。")}</p>
                <a
                  href={github.installers.macos.appleSilicon}
                  className="doc-button"
                  rel="noreferrer"
                  target="_blank"
                >
                  {txt("Download .dmg", "下载 .dmg")}
                </a>
              </div>

              <div className="feature-card bg-white/90">
                <h3 className="mb-2 text-[16px] font-semibold text-gray-900">Intel (x64)</h3>
                <p className="mb-4 text-[14px] text-gray-600">{txt("For Intel-based Macs.", "适用于 Intel Mac。")}</p>
                <a
                  href={github.installers.macos.intel}
                  className="doc-button"
                  rel="noreferrer"
                  target="_blank"
                >
                  {txt("Download .dmg", "下载 .dmg")}
                </a>
              </div>
            </div>
          </section>

          <hr />

          <section id="windows" className="py-6">
            <h2 className="mb-2 text-2xl font-bold md:text-3xl">Windows</h2>
            <p className="mb-6 text-[15px] text-gray-700">
              {txt("OpenWork for Windows is available as an x64 MSI installer.", "OpenWork for Windows 目前提供 x64 MSI 安装器。")}
            </p>
            <a
              href={github.installers.windows.x64}
              className="doc-button"
              rel="noreferrer"
              target="_blank"
            >
              {txt("Download Windows x64 (.msi)", "下载 Windows x64 (.msi)")}
            </a>
          </section>

          <hr />

          <section id="linux" className="py-6">
            <h2 className="mb-2 text-2xl font-bold md:text-3xl">Linux</h2>
            <p className="mb-8 text-[15px] text-gray-700">
              {txt(
                "Install from AUR on Arch-based distributions, or download packages directly for Ubuntu/Debian and Fedora/RHEL/openSUSE.",
                "Arch 系可通过 AUR 安装；Ubuntu/Debian 与 Fedora/RHEL/openSUSE 可直接下载安装包。",
              )}
            </p>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="feature-card border-emerald-100 bg-white/90 ring-1 ring-emerald-100/60">
                <h3 className="mb-2 text-[16px] font-semibold text-gray-900">Arch Linux (AUR)</h3>
                <p className="mb-4 text-[14px] text-gray-600">
                  {txt("Install and keep OpenWork updated via the Arch User Repository.", "通过 Arch User Repository 安装并持续更新 OpenWork。")}
                </p>
                <pre className="mono overflow-x-auto rounded-lg bg-gray-950 px-4 py-3 text-[13px] text-gray-100">
                  <code>yay -S openwork</code>
                </pre>
                <p className="mt-3 text-[13px] text-gray-600">
                  {txt("Prefer paru?", "更习惯 paru？")} <span className="mono">paru -S openwork</span>
                </p>
                <a
                  href={github.installers.linux.aur}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-4 inline-flex text-[13px] font-semibold text-gray-700 underline decoration-gray-300 underline-offset-4 transition hover:text-black"
                >
                  {txt("View package on AUR", "在 AUR 查看包信息")}
                </a>
              </div>

              <div className="feature-card border-amber-100 bg-white/90 ring-1 ring-amber-100/60">
                <h3 className="mb-2 text-[16px] font-semibold text-gray-900">Ubuntu / Debian (.deb)</h3>
                <p className="mb-4 text-[14px] text-gray-600">
                  {txt("Download the package for your architecture.", "下载与你架构匹配的安装包。")}
                </p>
                <div className="flex flex-wrap gap-3">
                  <a
                    href={github.installers.linux.debX64}
                    target="_blank"
                    rel="noreferrer"
                    className="doc-button"
                  >
                    x64 .deb
                  </a>
                  <a
                    href={github.installers.linux.debArm64}
                    target="_blank"
                    rel="noreferrer"
                    className="doc-button"
                  >
                    arm64 .deb
                  </a>
                </div>
              </div>

              <div className="feature-card border-sky-100 bg-white/90 ring-1 ring-sky-100/60">
                <h3 className="mb-2 text-[16px] font-semibold text-gray-900">Fedora / RHEL / openSUSE (.rpm)</h3>
                <p className="mb-4 text-[14px] text-gray-600">
                  {txt("Download an RPM package for x64 or arm64 systems.", "下载适用于 x64 或 arm64 系统的 RPM 包。")}
                </p>
                <div className="flex flex-wrap gap-3">
                  <a
                    href={github.installers.linux.rpmX64}
                    target="_blank"
                    rel="noreferrer"
                    className="doc-button"
                  >
                    x64 .rpm
                  </a>
                  <a
                    href={github.installers.linux.rpmArm64}
                    target="_blank"
                    rel="noreferrer"
                    className="doc-button"
                  >
                    arm64 .rpm
                  </a>
                </div>
              </div>
            </div>

            <p className="mt-8 text-[14px] text-gray-600">
              {txt("Need another format? ", "需要其他格式？")}
              <a
                href={releaseUrl}
                target="_blank"
                rel="noreferrer"
                className="font-semibold text-gray-900 underline decoration-gray-300 underline-offset-4 transition hover:decoration-gray-700"
              >
                {txt("Browse all release assets", "浏览全部发布资源")}
              </a>
              .
            </p>
          </section>

          <SiteFooter locale={locale} />
        </div>
      </main>
    </div>
  );
}
