import type { ProviderAuthAuthorization } from "@opencode-ai/sdk/v2/client";
import { CheckCircle2, Loader2, X } from "lucide-solid";
import type { ProviderListItem } from "../types";
import { createEffect, createMemo, createSignal, For, Show } from "solid-js";
import { isTauriRuntime } from "../utils";
import { currentLocale, t } from "../../i18n";

import Button from "./button";
import TextInput from "./text-input";

type ProviderAuthMethod = { type: "oauth" | "api"; label: string };
type ProviderAuthEntry = {
  id: string;
  name: string;
  methods: ProviderAuthMethod[];
  connected: boolean;
  env: string[];
};

export type ProviderOAuthStartResult = {
  methodIndex: number;
  authorization: ProviderAuthAuthorization;
};

type ProviderOAuthSession = ProviderOAuthStartResult & {
  providerId: string;
};

const PROVIDER_LABELS: Record<string, string> = {
  opencode: "OpenCode",
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google",
  openrouter: "OpenRouter",
};

export type ProviderAuthModalProps = {
  open: boolean;
  loading: boolean;
  submitting: boolean;
  error: string | null;
  providers: ProviderListItem[];
  connectedProviderIds: string[];
  authMethods: Record<string, ProviderAuthMethod[]>;
  onSelect: (providerId: string) => Promise<ProviderOAuthStartResult>;
  onSubmitApiKey: (providerId: string, apiKey: string) => Promise<string | void>;
  onSubmitOAuth: (providerId: string, methodIndex: number, code?: string) => Promise<string | void>;
  onClose: () => void;
};

export default function ProviderAuthModal(props: ProviderAuthModalProps) {
  const translate = (key: string) => t(key, currentLocale());

  const formatProviderName = (id: string, fallback?: string) => {
    const named = fallback?.trim();
    if (named) return named;

    const normalized = id.trim();
    const mapped = PROVIDER_LABELS[normalized.toLowerCase()];
    if (mapped) return mapped;

    const cleaned = normalized.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
    if (!cleaned) return id;

    return cleaned
      .split(" ")
      .filter(Boolean)
      .map((word) => {
        if (/\d/.test(word) || word.length <= 3) {
          return word.toUpperCase();
        }
        const lower = word.toLowerCase();
        return lower.charAt(0).toUpperCase() + lower.slice(1);
      })
      .join(" ");
  };

  const entries = createMemo<ProviderAuthEntry[]>(() => {
    const methods = props.authMethods ?? {};
    const connected = new Set(props.connectedProviderIds ?? []);
    const providers = props.providers ?? [];

    return Object.keys(methods)
      .map((id): ProviderAuthEntry => {
        const provider = providers.find((item) => item.id === id);
        return {
          id,
          name: formatProviderName(id, provider?.name),
          methods: methods[id] ?? [],
          connected: connected.has(id),
          env: Array.isArray(provider?.env) ? provider.env : [],
        };
      })
      .sort((a, b) => {
        const aIsOpencode = a.id === "opencode";
        const bIsOpencode = b.id === "opencode";
        if (aIsOpencode !== bIsOpencode) return aIsOpencode ? -1 : 1;
        return a.name.localeCompare(b.name);
      });
  });

  const methodLabel = (method: ProviderAuthMethod) =>
    method.label || (method.type === "oauth" ? translate("provider_auth.oauth") : translate("provider_auth.api_key"));

  const actionDisabled = () => props.loading || props.submitting;

  const [view, setView] = createSignal<"list" | "method" | "api" | "oauth-code" | "oauth-auto">("list");
  const [selectedProviderId, setSelectedProviderId] = createSignal<string | null>(null);
  const [apiKeyInput, setApiKeyInput] = createSignal("");
  const [oauthCodeInput, setOauthCodeInput] = createSignal("");
  const [oauthSession, setOauthSession] = createSignal<ProviderOAuthSession | null>(null);
  const [searchQuery, setSearchQuery] = createSignal("");
  const [activeEntryIndex, setActiveEntryIndex] = createSignal(0);
  const [localError, setLocalError] = createSignal<string | null>(null);
  let searchInputEl: HTMLInputElement | undefined;

  const selectedEntry = createMemo(() =>
    entries().find((entry) => entry.id === selectedProviderId()) ?? null,
  );

  const resolvedView = createMemo(() => (selectedEntry() ? view() : "list"));
  const errorMessage = createMemo(() => localError() ?? props.error);

  const filteredEntries = createMemo(() => {
    const query = searchQuery().trim().toLowerCase();
    if (!query) return entries();
    return entries().filter((entry) => {
      const methodText = entry.methods.map((method) => methodLabel(method)).join(" ");
      return `${entry.name} ${entry.id} ${methodText}`.toLowerCase().includes(query);
    });
  });

  const oauthInstructions = createMemo(() => oauthSession()?.authorization.instructions?.trim() ?? "");

  const oauthDisplayCode = createMemo(() => {
    const instructions = oauthInstructions();
    if (!instructions) return "";
    const matched = instructions.match(/[A-Z0-9]{4}-[A-Z0-9]{4,5}/)?.[0];
    if (matched) return matched;
    if (instructions.includes(":")) {
      return instructions.split(":").slice(1).join(":").trim();
    }
    return instructions;
  });

  const resetState = () => {
    setView("list");
    setSelectedProviderId(null);
    setApiKeyInput("");
    setOauthCodeInput("");
    setOauthSession(null);
    setSearchQuery("");
    setActiveEntryIndex(0);
    setLocalError(null);
  };

  createEffect(() => {
    if (!props.open) {
      resetState();
    }
  });

  createEffect(() => {
    if (!props.open || resolvedView() !== "list") return;
    const total = filteredEntries().length;
    if (total <= 0) {
      setActiveEntryIndex(0);
      return;
    }
    setActiveEntryIndex((current) => Math.max(0, Math.min(current, total - 1)));
  });

  createEffect(() => {
    if (!props.open || resolvedView() !== "list") return;
    queueMicrotask(() => {
      searchInputEl?.focus();
    });
  });

  const hasMethod = (entry: ProviderAuthEntry | null, type: ProviderAuthMethod["type"]) =>
    !!entry?.methods?.some((method) => method.type === type);

  const handleClose = () => {
    resetState();
    props.onClose();
  };

  const openOauthUrl = async (url: string) => {
    if (!url) return;
    if (isTauriRuntime()) {
      const { openUrl } = await import("@tauri-apps/plugin-opener");
      await openUrl(url);
      return;
    }
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const submitOauth = async (providerId: string, methodIndex: number, code?: string) => {
    const trimmedCode = code?.trim();
    setLocalError(null);
    try {
      await props.onSubmitOAuth(providerId, methodIndex, trimmedCode || undefined);
    } catch (error) {
      const message = error instanceof Error ? error.message : translate("provider_auth.failed_complete_oauth");
      setLocalError(message);
      throw error instanceof Error ? error : new Error(message);
    }
  };

  const startOauth = async (entry: ProviderAuthEntry) => {
    if (actionDisabled()) return;
    setLocalError(null);
    setOauthCodeInput("");
    setOauthSession(null);
    try {
      const started = await props.onSelect(entry.id);
      const nextSession: ProviderOAuthSession = {
        providerId: entry.id,
        methodIndex: started.methodIndex,
        authorization: started.authorization,
      };
      setOauthSession(nextSession);
      await openOauthUrl(started.authorization.url);

      if (started.authorization.method === "code") {
        setView("oauth-code");
        return;
      }

      setView("oauth-auto");
      await submitOauth(entry.id, started.methodIndex);
    } catch (error) {
      const message = error instanceof Error ? error.message : translate("provider_auth.failed_start_oauth");
      setLocalError(message);
    }
  };

  const handleEntrySelect = (entry: ProviderAuthEntry) => {
    if (actionDisabled()) return;
    setLocalError(null);
    setSelectedProviderId(entry.id);

    const hasOauth = hasMethod(entry, "oauth");
    const hasApi = hasMethod(entry, "api");

    if (hasOauth && !hasApi) {
      void startOauth(entry);
      return;
    }

    if (hasApi && !hasOauth) {
      setView("api");
      return;
    }

    if (hasApi && hasOauth) {
      setView("method");
      return;
    }

    setLocalError(`${translate("provider_auth.no_auth_methods_for")} ${entry.name}.`);
  };

  const handleMethodSelect = (method: ProviderAuthMethod["type"]) => {
    const entry = selectedEntry();
    if (!entry || actionDisabled()) return;
    setLocalError(null);

    if (method === "oauth") {
      void startOauth(entry);
      return;
    }

    setView("api");
  };

  const handleApiSubmit = async () => {
    const entry = selectedEntry();
    if (!entry || actionDisabled()) return;

    const trimmed = apiKeyInput().trim();
    if (!trimmed) {
      setLocalError(translate("provider_auth.api_key_required"));
      return;
    }

    setLocalError(null);
    try {
      await props.onSubmitApiKey(entry.id, trimmed);
    } catch (error) {
      const message = error instanceof Error ? error.message : translate("provider_auth.failed_save_api_key");
      setLocalError(message);
    }
  };

  const handleOauthCodeSubmit = async () => {
    const entry = selectedEntry();
    const session = oauthSession();
    if (!entry || !session || actionDisabled()) return;

    const trimmed = oauthCodeInput().trim();
    if (!trimmed) {
      setLocalError(translate("provider_auth.authorization_code_required"));
      return;
    }

    await submitOauth(entry.id, session.methodIndex, trimmed);
  };

  const handleOauthAutoRetry = async () => {
    const entry = selectedEntry();
    const session = oauthSession();
    if (!entry || !session || actionDisabled()) return;
    await submitOauth(entry.id, session.methodIndex);
  };

  const handleBack = () => {
    if (resolvedView() === "oauth-code" || resolvedView() === "oauth-auto") {
      if (hasMethod(selectedEntry(), "api")) {
        setView("method");
      } else {
        setView("list");
      }
      setOauthSession(null);
      setOauthCodeInput("");
      setLocalError(null);
      return;
    }

    if (resolvedView() === "api" && hasMethod(selectedEntry(), "oauth")) {
      setView("method");
      setApiKeyInput("");
      setLocalError(null);
      return;
    }
    resetState();
  };

  const submittingLabel = () => {
    if (!props.submitting) return null;
    if (resolvedView() === "api") return translate("provider_auth.saving_api_key");
    if (resolvedView() === "oauth-code") return translate("provider_auth.verifying_authorization_code");
    if (resolvedView() === "oauth-auto") return translate("provider_auth.waiting_oauth_confirmation");
    return translate("provider_auth.opening_authentication");
  };

  const stepEntryIndex = (delta: number) => {
    const total = filteredEntries().length;
    if (total <= 0) {
      setActiveEntryIndex(0);
      return;
    }
    setActiveEntryIndex((current) => {
      const normalized = ((current % total) + total) % total;
      return (normalized + delta + total) % total;
    });
  };

  const handleListKeyDown = (event: KeyboardEvent) => {
    if (resolvedView() !== "list") return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      stepEntryIndex(1);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      stepEntryIndex(-1);
      return;
    }
    if (event.key === "Enter") {
      if (event.isComposing || (event as KeyboardEvent & { keyCode?: number }).keyCode === 229) return;
      const entry = filteredEntries()[activeEntryIndex()];
      if (!entry) return;
      event.preventDefault();
      handleEntrySelect(entry);
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      handleClose();
    }
  };

  return (
    <Show when={props.open}>
      <div class="fixed inset-0 z-50 bg-gray-1/60 backdrop-blur-sm flex items-start justify-center p-4 overflow-y-auto">
        <div class="bg-gray-2 border border-gray-6/70 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden max-h-[calc(100vh-2rem)] flex flex-col">
          <div class="px-6 pt-6 pb-4 border-b border-gray-6/50 flex items-start justify-between gap-4">
            <div>
              <h3 class="text-lg font-semibold text-gray-12">{translate("provider_auth.connect_providers")}</h3>
              <p class="text-sm text-gray-11 mt-1">{translate("provider_auth.sign_in_services")}</p>
            </div>
            <Button
              variant="ghost"
              class="!p-2 rounded-full"
              onClick={handleClose}
              aria-label={translate("common.close")}
            >
              <X size={16} />
            </Button>
          </div>

          <div class="px-6 py-4 flex flex-col gap-4 min-h-0">
            <div class="min-h-[36px]">
              <Show
                when={errorMessage()}
                fallback={
                  <Show when={props.loading}>
                    <div class="rounded-xl border border-gray-6 bg-gray-1/60 px-4 py-3 text-sm text-gray-10 animate-pulse">
                      {translate("provider_auth.loading_providers")}
                    </div>
                  </Show>
                }
              >
                <div class="rounded-xl border border-red-7/30 bg-red-1/40 px-3 py-2 text-xs text-red-11">
                  {errorMessage()}
                </div>
              </Show>
            </div>

            <Show when={!props.loading}>
              <div class="flex-1 space-y-2 overflow-y-auto pr-1 -mr-1">
                <Show when={resolvedView() === "list"}>
                  <div class="space-y-3" onKeyDown={handleListKeyDown}>
                    <TextInput
                      ref={searchInputEl}
                      label={translate("provider_auth.search")}
                      type="text"
                      placeholder={translate("provider_auth.filter_providers")}
                      value={searchQuery()}
                      onInput={(event) => {
                        setSearchQuery(event.currentTarget.value);
                        setActiveEntryIndex(0);
                      }}
                      autocomplete="off"
                      autocapitalize="off"
                      spellcheck={false}
                      disabled={actionDisabled()}
                    />

                    <Show
                      when={filteredEntries().length}
                      fallback={
                        <div class="text-sm text-gray-10">
                          {entries().length ? translate("provider_auth.no_provider_matches") : translate("provider_auth.no_providers_available")}
                        </div>
                      }
                    >
                      <For each={filteredEntries()}>
                        {(entry, index) => {
                          const idx = () => index();
                          return (
                            <button
                              type="button"
                              class={`w-full rounded-xl border px-4 py-3 text-left transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                                idx() === activeEntryIndex()
                                  ? "border-gray-8 bg-gray-1/80"
                                  : "border-gray-6 bg-gray-1/40 hover:bg-gray-1/70"
                              }`}
                              disabled={actionDisabled()}
                              onMouseEnter={() => setActiveEntryIndex(idx())}
                              onClick={() => handleEntrySelect(entry)}
                            >
                              <div class="flex items-center justify-between gap-3">
                                <div class="min-w-0">
                                  <div class="text-sm font-medium text-gray-12 truncate">{entry.name}</div>
                                  <div class="text-[11px] text-gray-8 font-mono truncate">{entry.id}</div>
                                </div>
                                <div class="flex items-center justify-end gap-2 shrink-0 min-w-[108px]">
                                  <Show
                                    when={entry.connected}
                                    fallback={<span class="text-xs text-gray-9">{translate("provider_auth.connect")}</span>}
                                  >
                                    <div class="flex items-center gap-1 text-[11px] text-green-11 bg-green-7/10 border border-green-7/20 px-2 py-1 rounded-full">
                                      <CheckCircle2 size={12} />
                                      {translate("provider_auth.connected")}
                                    </div>
                                  </Show>
                                </div>
                              </div>
                              <div class="mt-2 flex flex-wrap gap-2">
                                <For each={entry.methods}>
                                  {(method) => (
                                    <span
                                      class={`text-[10px] uppercase tracking-[0.2em] px-2 py-1 rounded-full border ${
                                        method.type === "oauth"
                                          ? "bg-indigo-7/15 text-indigo-11 border-indigo-7/30"
                                          : "bg-gray-3 text-gray-11 border-gray-6"
                                      }`}
                                    >
                                      {methodLabel(method)}
                                    </span>
                                  )}
                                </For>
                              </div>
                            </button>
                          );
                        }}
                      </For>
                    </Show>

                    <div class="text-[11px] text-gray-9">{translate("provider_auth.keyboard_hint")}</div>
                  </div>
                </Show>

                <Show when={resolvedView() === "method" && selectedEntry()}>
                  <div class="rounded-xl border border-gray-6/60 bg-gray-1/40 p-4 space-y-4">
                    <div class="flex items-center justify-between gap-4">
                      <div>
                        <div class="text-sm font-medium text-gray-12">{selectedEntry()!.name}</div>
                        <div class="text-xs text-gray-10 mt-1">{translate("provider_auth.choose_connect_method")}</div>
                      </div>
                      <Button variant="ghost" onClick={handleBack} disabled={actionDisabled()}>
                        {translate("provider_auth.back")}
                      </Button>
                    </div>
                    <div class="grid gap-2">
                      <Show when={hasMethod(selectedEntry(), "oauth")}>
                        <Button
                          variant="secondary"
                          onClick={() => void handleMethodSelect("oauth")}
                          disabled={actionDisabled()}
                        >
                          {translate("provider_auth.continue_with_oauth")}
                        </Button>
                      </Show>
                      <Show when={hasMethod(selectedEntry(), "api")}>
                        <Button
                          variant="outline"
                          onClick={() => handleMethodSelect("api")}
                          disabled={actionDisabled()}
                        >
                          {translate("provider_auth.use_api_key")}
                        </Button>
                      </Show>
                    </div>
                  </div>
                </Show>

                <Show when={resolvedView() === "api" && selectedEntry()}>
                  <div class="rounded-xl border border-gray-6/60 bg-gray-1/40 p-4 space-y-4">
                    <div class="flex items-center justify-between gap-4">
                      <div>
                        <div class="text-sm font-medium text-gray-12">{selectedEntry()!.name}</div>
                        <div class="text-xs text-gray-10 mt-1">{translate("provider_auth.paste_api_key_connect")}</div>
                      </div>
                      <Button variant="ghost" onClick={handleBack} disabled={actionDisabled()}>
                        {translate("provider_auth.back")}
                      </Button>
                    </div>
                    <TextInput
                      label={translate("provider_auth.api_key")}
                      type="password"
                      placeholder={translate("provider_auth.api_key_placeholder")}
                      value={apiKeyInput()}
                      onInput={(event) => {
                        setApiKeyInput(event.currentTarget.value);
                        if (localError()) setLocalError(null);
                      }}
                      autocomplete="off"
                      autocapitalize="off"
                      spellcheck={false}
                      disabled={actionDisabled()}
                    />
                    <Show when={selectedEntry()!.env.length > 0}>
                      <div class="text-[11px] text-gray-9">
                        {translate("provider_auth.env_vars")}: <span class="font-mono">{selectedEntry()!.env.join(", ")}</span>
                      </div>
                    </Show>
                    <div class="flex items-center justify-between gap-3">
                      <div class="text-[11px] text-gray-9">
                        {translate("provider_auth.keys_stored_locally")}
                      </div>
                      <Button
                        variant="secondary"
                        onClick={handleApiSubmit}
                        disabled={actionDisabled() || !apiKeyInput().trim()}
                      >
                        {props.submitting ? translate("provider_auth.saving") : translate("provider_auth.save_key")}
                      </Button>
                    </div>
                  </div>
                </Show>

                <Show when={resolvedView() === "oauth-code" && selectedEntry() && oauthSession()}>
                  <div class="rounded-xl border border-gray-6/60 bg-gray-1/40 p-4 space-y-4">
                    <div class="flex items-center justify-between gap-4">
                      <div>
                        <div class="text-sm font-medium text-gray-12">{selectedEntry()!.name}</div>
                        <div class="text-xs text-gray-10 mt-1">{translate("provider_auth.finish_oauth_paste_code")}</div>
                      </div>
                      <Button variant="ghost" onClick={handleBack} disabled={actionDisabled()}>
                        {translate("provider_auth.back")}
                      </Button>
                    </div>
                    <div class="text-xs text-gray-9">
                      {translate("provider_auth.complete_sign_in_then_paste")}
                    </div>
                    <Show when={oauthInstructions()}>
                      <div class="rounded-lg border border-gray-6/60 bg-gray-1/60 px-3 py-2 text-[11px] text-gray-9 font-mono break-all">
                        {oauthInstructions()}
                      </div>
                    </Show>
                    <TextInput
                      label={translate("provider_auth.authorization_code")}
                      type="text"
                      placeholder={translate("provider_auth.paste_code")}
                      value={oauthCodeInput()}
                      onInput={(event) => {
                        setOauthCodeInput(event.currentTarget.value);
                        if (localError()) setLocalError(null);
                      }}
                      onKeyDown={(event) => {
                        if (event.key !== "Enter") return;
                        event.preventDefault();
                        void handleOauthCodeSubmit();
                      }}
                      autocomplete="off"
                      autocapitalize="off"
                      spellcheck={false}
                      disabled={actionDisabled()}
                    />
                    <div class="flex items-center justify-between gap-3">
                      <Button
                        variant="outline"
                        onClick={() => {
                          const url = oauthSession()?.authorization.url ?? "";
                          void openOauthUrl(url);
                        }}
                        disabled={actionDisabled()}
                      >
                        {translate("provider_auth.open_browser_again")}
                      </Button>
                      <Button
                        variant="secondary"
                        onClick={() => void handleOauthCodeSubmit()}
                        disabled={actionDisabled() || !oauthCodeInput().trim()}
                      >
                        {props.submitting ? translate("provider_auth.verifying") : translate("provider_auth.complete_connection")}
                      </Button>
                    </div>
                  </div>
                </Show>

                <Show when={resolvedView() === "oauth-auto" && selectedEntry() && oauthSession()}>
                  <div class="rounded-xl border border-gray-6/60 bg-gray-1/40 p-4 space-y-4">
                    <div class="flex items-center justify-between gap-4">
                      <div>
                        <div class="text-sm font-medium text-gray-12">{selectedEntry()!.name}</div>
                        <div class="text-xs text-gray-10 mt-1">{translate("provider_auth.waiting_browser_confirmation")}</div>
                      </div>
                      <Button variant="ghost" onClick={handleBack} disabled={actionDisabled()}>
                        {translate("provider_auth.back")}
                      </Button>
                    </div>
                    <div class="text-xs text-gray-9">{translate("provider_auth.sign_in_browser_tab_auto_complete")}</div>
                    <Show when={oauthDisplayCode()}>
                      <TextInput label={translate("provider_auth.confirmation_code")} value={oauthDisplayCode()} readOnly class="font-mono" />
                    </Show>
                    <div class="flex items-center gap-2 text-xs text-gray-9">
                      <Loader2 size={14} class={props.submitting ? "animate-spin" : ""} />
                      <span>{props.submitting ? translate("provider_auth.waiting_confirmation") : translate("provider_auth.ready_retry_completion")}</span>
                    </div>
                    <div class="flex items-center justify-between gap-3">
                      <Button
                        variant="outline"
                        onClick={() => {
                          const url = oauthSession()?.authorization.url ?? "";
                          void openOauthUrl(url);
                        }}
                        disabled={actionDisabled()}
                      >
                        {translate("provider_auth.open_browser_again")}
                      </Button>
                      <Button variant="secondary" onClick={() => void handleOauthAutoRetry()} disabled={actionDisabled()}>
                        {props.submitting ? translate("provider_auth.waiting") : translate("provider_auth.retry_completion")}
                      </Button>
                    </div>
                  </div>
                </Show>
              </div>
            </Show>
          </div>

          <div class="px-6 pt-4 pb-6 border-t border-gray-6/50 flex flex-col gap-3">
            <div class="min-h-[16px] text-xs text-gray-10">
              <Show when={props.submitting}>{submittingLabel()}</Show>
            </div>
            <div class="text-xs text-gray-9">
              {translate("provider_auth.footer_oauth_browser")}{" "}
              <span class="font-mono">{translate("provider_auth.models_command")}</span> {translate("provider_auth.footer_pick_default")}
            </div>
            <Button variant="ghost" onClick={handleClose} disabled={actionDisabled()}>
              {translate("common.close")}
            </Button>
          </div>
        </div>
      </div>
    </Show>
  );
}
