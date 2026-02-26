import type { Metadata } from "next";
import { headers } from "next/headers";
import { IBM_Plex_Mono, Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap"
});

const ibmPlexMono = IBM_Plex_Mono({
  subsets: ["latin"],
  variable: "--font-ibm-plex-mono",
  display: "swap",
  weight: ["400", "500"]
});

function normalizeWebLocale(input: string | null | undefined): "en" | "zh" {
  if (!input) return "en";
  const value = input.trim().toLowerCase();
  if (!value) return "en";
  if (value.startsWith("zh")) return "zh";
  return "en";
}

export async function generateMetadata(): Promise<Metadata> {
  const requestHeaders = await headers();
  const locale = normalizeWebLocale(requestHeaders.get("accept-language") ?? process.env.OPENWORK_LANG);
  return {
    title: locale === "zh" ? "OpenWork Cloud 云端控制台" : "OpenWork Cloud",
    description:
      locale === "zh"
        ? "启动 OpenWork 云端 worker，处理 Polar 支付流程，并在 app.openwork.software 管理 Den。"
        : "Launch OpenWork cloud workers, handle Polar paywall flows, and operate Den from app.openwork.software.",
  };
}

export default async function RootLayout({
  children
}: Readonly<{ children: React.ReactNode }>) {
  const requestHeaders = await headers();
  const locale = normalizeWebLocale(requestHeaders.get("accept-language") ?? process.env.OPENWORK_LANG);
  return (
    <html lang={locale} className={`${inter.variable} ${ibmPlexMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
