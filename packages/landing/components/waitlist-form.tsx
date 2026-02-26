"use client";

import { useCallback, useRef, useState } from "react";
import { pickByLocale, type LandingLocale } from "../lib/i18n";

const FORM_ACTION =
  "https://app.loops.so/api/newsletter-form/cmkhtp90l03np0i1z8iy6kccz";

type FormState = "idle" | "loading" | "success" | "error" | "rate-limited";

type Props = {
  locale: LandingLocale;
};

export function WaitlistForm(props: Props) {
  const [state, setState] = useState<FormState>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const txt = (en: string, zh: string) => pickByLocale(props.locale, en, zh);

  const reset = useCallback(() => {
    setState("idle");
    setErrorMsg("");
  }, []);

  const handleSubmit = useCallback(
    async (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault();
      const email = inputRef.current?.value?.trim();
      if (!email) return;

      const now = Date.now();
      const prev = localStorage.getItem("loops-form-timestamp");
      if (prev && Number(prev) + 60_000 > now) {
        setState("rate-limited");
        setErrorMsg(txt("Too many signups, please try again in a little while", "提交过于频繁，请稍后再试。"));
        return;
      }
      localStorage.setItem("loops-form-timestamp", String(now));

      setState("loading");

      try {
        const body =
          "userGroup=&mailingLists=&email=" + encodeURIComponent(email);
        const res = await fetch(FORM_ACTION, {
          method: "POST",
          body,
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
        });

        if (res.ok) {
          setState("success");
          if (inputRef.current) inputRef.current.value = "";
        } else {
          const data = await res.json().catch(() => null);
          setState("error");
          setErrorMsg(
            data?.message ?? res.statusText ?? txt("Something went wrong", "发生错误，请稍后重试。")
          );
        }
      } catch (err: unknown) {
        if (err instanceof Error && err.message === "Failed to fetch") {
          setState("rate-limited");
          setErrorMsg(txt("Too many signups, please try again in a little while", "提交过于频繁，请稍后再试。"));
          return;
        }
        setState("error");
        setErrorMsg(
          err instanceof Error ? err.message : txt("Something went wrong", "发生错误，请稍后重试。")
        );
        localStorage.setItem("loops-form-timestamp", "");
      }
    },
    [txt]
  );

  if (state === "success") {
    return (
      <div className="space-y-3">
        <p className="text-[15px] text-gray-700">
          {txt("You're in. We'll keep you in the loop.", "提交成功，我们会及时通知你。")}
        </p>
        <button
          onClick={reset}
          className="text-[14px] text-gray-500 transition hover:text-black"
        >
          {txt("\u2190 Add another email", "\u2190 继续添加邮箱")}
        </button>
      </div>
    );
  }

  if (state === "error" || state === "rate-limited") {
    return (
      <div className="space-y-3">
        <p className="text-[15px] text-red-700">
          {errorMsg || txt("Something went wrong. Please try again.", "发生错误，请重试。")}
        </p>
        <button
          onClick={reset}
          className="text-[14px] text-gray-500 transition hover:text-black"
        >
          {txt("\u2190 Try again", "\u2190 重试")}
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-wrap items-center gap-3"
    >
      <input
        ref={inputRef}
        type="email"
        name="email"
        required
        placeholder={txt("you@example.com", "you@example.com")}
        autoComplete="email"
        disabled={state === "loading"}
        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-[14px] text-gray-900 outline-none transition focus:border-gray-300 disabled:opacity-60 sm:w-auto"
      />
      <button
        type="submit"
        disabled={state === "loading"}
        className="doc-button disabled:opacity-60"
      >
        {state === "loading" ? txt("Please wait...", "请稍候...") : txt("Keep me in the loop", "订阅更新")}
        {state !== "loading" && (
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
        )}
      </button>
    </form>
  );
}
