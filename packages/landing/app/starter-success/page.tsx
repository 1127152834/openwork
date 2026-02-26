import { SiteFooter } from "../../components/site-footer";
import { SiteNav } from "../../components/site-nav";
import { getGithubData } from "../../lib/github";
import { pickByLocale } from "../../lib/i18n";
import { getLandingLocale } from "../../lib/server-locale";

export async function generateMetadata() {
  const locale = await getLandingLocale();
  return {
    title: pickByLocale(locale, "OpenWork - Starter Success", "OpenWork - Starter 订阅成功"),
    description: pickByLocale(
      locale,
      "Thanks for pre-ordering OpenWork Team Starter.",
      "感谢预购 OpenWork Team Starter。",
    ),
  };
}

export default async function StarterSuccessPage() {
  const github = await getGithubData();
  const locale = await getLandingLocale();
  const txt = (en: string, zh: string) => pickByLocale(locale, en, zh);
  const calBase = process.env.NEXT_PUBLIC_CAL_URL ?? "";
  const calHref = (() => {
    if (!calBase) return "/enterprise#book";
    try {
      const url = new URL(calBase);
      url.searchParams.set("source", "starter-success");
      url.searchParams.set("notes", "Paid customer: OpenWork Team Starter (12 months). Priority onboarding requested.");
      url.searchParams.set("description", "Paid customer - Team Starter (12 months). Please prioritize onboarding.");
      return url.toString();
    } catch {
      return calBase;
    }
  })();

  return (
    <div className="min-h-screen">
      <SiteNav stars={github.stars} locale={locale} />

      <main className="pb-24 pt-20">
        <div className="content-max-width px-6">
          <section className="animate-fade-up">
            <div className="mb-4 inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-emerald-700">
              {txt("starter confirmed", "starter 已确认")}
            </div>

            <h1 className="mb-4 text-4xl font-bold tracking-tight">
              {txt("Thank you. You're in.", "感谢支持，你已加入。")}
            </h1>

            <p className="max-w-2xl text-[16px] leading-relaxed text-gray-700">
              {txt("You're on track for getting access to OpenWork Hosted in 7 days.", "你将在 7 天内获得 OpenWork Hosted 访问资格。")}
            </p>
          </section>

          <section className="mt-10 grid grid-cols-1 gap-6 md:grid-cols-2">
            <div className="feature-card">
              <h2 className="mb-2 text-[15px] font-bold">{txt("What happens next", "接下来会发生什么")}</h2>
              <ul className="space-y-2 text-[14px] leading-relaxed text-gray-600">
                <li>{txt("- We review your team setup and use case.", "- 我们会评估你的团队配置与使用场景。")}</li>
                <li>{txt("- We send rollout details for teams up to 10 people.", "- 我们会发送最多 10 人团队的上线细节。")}</li>
                <li>{txt("- You get early access as hosted workers go live.", "- 托管 worker 上线后，你将优先获得访问权限。")}</li>
              </ul>
            </div>

            <div className="feature-card bg-gradient-to-br from-blue-50 to-orange-50">
              <h2 className="mb-2 text-[15px] font-bold">{txt("Want to accelerate?", "想更快推进？")}</h2>
              <p className="mb-4 text-[14px] leading-relaxed text-gray-600">
                {txt(
                  "Schedule a call with the founder to accelerate and share your use case.",
                  "可预约与创始人沟通，加速上线并交流你的业务场景。",
                )}
              </p>
              <a href={calHref} className="doc-button">
                {txt("Schedule founder call", "预约创始人沟通")}
              </a>
            </div>
          </section>

          <div className="mt-10 rounded-xl border border-gray-100 bg-white p-5 text-[13px] text-gray-500">
            {txt(
              "OpenWork stays open source, runs in any environment, and works with any model.",
              "OpenWork 持续开源，可在任意环境运行，并兼容任意模型。",
            )}
          </div>

          <SiteFooter locale={locale} />
        </div>
      </main>
    </div>
  );
}
