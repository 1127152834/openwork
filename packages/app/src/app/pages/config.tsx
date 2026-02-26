import { Show, createEffect, createMemo, createSignal, onCleanup } from "solid-js";

import { isTauriRuntime } from "../utils";
import { readPerfLogs } from "../lib/perf-log";

import Button from "../components/button";
import TextInput from "../components/text-input";

import { RefreshCcw } from "lucide-solid";

import { buildOpenworkWorkspaceBaseUrl, parseOpenworkWorkspaceIdFromUrl } from "../lib/openwork-server";
import type { OpenworkServerSettings, OpenworkServerStatus } from "../lib/openwork-server";
import type { OpenworkServerInfo } from "../lib/tauri";
import { currentLocale, t } from "../../i18n";

export type ConfigViewProps = {
  busy: boolean;
  clientConnected: boolean;
  anyActiveRuns: boolean;

  openworkServerStatus: OpenworkServerStatus;
  openworkServerUrl: string;
  openworkServerSettings: OpenworkServerSettings;
  openworkServerHostInfo: OpenworkServerInfo | null;
  openworkServerWorkspaceId: string | null;

  updateOpenworkServerSettings: (next: OpenworkServerSettings) => void;
  resetOpenworkServerSettings: () => void;
  testOpenworkServerConnection: (next: OpenworkServerSettings) => Promise<boolean>;

  canReloadWorkspace: boolean;
  reloadWorkspaceEngine: () => Promise<void>;
  reloadBusy: boolean;
  reloadError: string | null;

  workspaceAutoReloadAvailable: boolean;
  workspaceAutoReloadEnabled: boolean;
  setWorkspaceAutoReloadEnabled: (value: boolean) => void | Promise<void>;
  workspaceAutoReloadResumeEnabled: boolean;
  setWorkspaceAutoReloadResumeEnabled: (value: boolean) => void | Promise<void>;

  developerMode: boolean;
};

export default function ConfigView(props: ConfigViewProps) {
  const translate = (key: string) => t(key, currentLocale());

  const [openworkUrl, setOpenworkUrl] = createSignal("");
  const [openworkToken, setOpenworkToken] = createSignal("");
  const [openworkTokenVisible, setOpenworkTokenVisible] = createSignal(false);
  const [openworkTestState, setOpenworkTestState] = createSignal<"idle" | "testing" | "success" | "error">("idle");
  const [openworkTestMessage, setOpenworkTestMessage] = createSignal<string | null>(null);
  const [clientTokenVisible, setClientTokenVisible] = createSignal(false);
  const [hostTokenVisible, setHostTokenVisible] = createSignal(false);
  const [copyingField, setCopyingField] = createSignal<string | null>(null);
  let copyTimeout: number | undefined;

  createEffect(() => {
    setOpenworkUrl(props.openworkServerSettings.urlOverride ?? "");
    setOpenworkToken(props.openworkServerSettings.token ?? "");
  });

  createEffect(() => {
    openworkUrl();
    openworkToken();
    setOpenworkTestState("idle");
    setOpenworkTestMessage(null);
  });

  const openworkStatusLabel = createMemo(() => {
    switch (props.openworkServerStatus) {
      case "connected":
        return translate("dashboard.connected");
      case "limited":
        return translate("config.status_limited");
      default:
        return translate("dashboard.not_connected");
    }
  });

  const openworkStatusStyle = createMemo(() => {
    switch (props.openworkServerStatus) {
      case "connected":
        return "bg-green-7/10 text-green-11 border-green-7/20";
      case "limited":
        return "bg-amber-7/10 text-amber-11 border-amber-7/20";
      default:
        return "bg-gray-4/60 text-gray-11 border-gray-7/50";
    }
  });

  const reloadAvailabilityReason = createMemo(() => {
    if (!props.clientConnected) return translate("config.reload_connect_first");
    if (!props.canReloadWorkspace) {
      return translate("config.reload_available_hint");
    }
    return null;
  });

  const reloadButtonLabel = createMemo(() => (props.reloadBusy ? translate("config.reloading") : translate("config.reload_engine")));
  const reloadButtonTone = createMemo(() => (props.anyActiveRuns ? "danger" : "secondary"));
  const reloadButtonDisabled = createMemo(() => props.reloadBusy || Boolean(reloadAvailabilityReason()));

  const buildOpenworkSettings = () => ({
    ...props.openworkServerSettings,
    urlOverride: openworkUrl().trim() || undefined,
    token: openworkToken().trim() || undefined,
  });

  const hasOpenworkChanges = createMemo(() => {
    const currentUrl = props.openworkServerSettings.urlOverride ?? "";
    const currentToken = props.openworkServerSettings.token ?? "";
    return openworkUrl().trim() !== currentUrl || openworkToken().trim() !== currentToken;
  });

  const resolvedWorkspaceId = createMemo(() => {
    const explicitId = props.openworkServerWorkspaceId?.trim() ?? "";
    if (explicitId) return explicitId;
    return parseOpenworkWorkspaceIdFromUrl(openworkUrl()) ?? "";
  });

  const resolvedWorkspaceUrl = createMemo(() => {
    const baseUrl = openworkUrl().trim();
    if (!baseUrl) return "";
    return buildOpenworkWorkspaceBaseUrl(baseUrl, resolvedWorkspaceId()) ?? baseUrl;
  });

  const hostInfo = createMemo(() => props.openworkServerHostInfo);
  const hostStatusLabel = createMemo(() => {
    if (!hostInfo()?.running) return translate("config.offline");
    return translate("config.available");
  });
  const hostStatusStyle = createMemo(() => {
    if (!hostInfo()?.running) return "bg-gray-4/60 text-gray-11 border-gray-7/50";
    return "bg-green-7/10 text-green-11 border-green-7/20";
  });
  const hostConnectUrl = createMemo(() => {
    const info = hostInfo();
    return info?.connectUrl ?? info?.mdnsUrl ?? info?.lanUrl ?? info?.baseUrl ?? "";
  });
  const hostConnectUrlUsesMdns = createMemo(() => hostConnectUrl().includes(".local"));

  const diagnosticsBundle = createMemo(() => {
    const urlOverride = props.openworkServerSettings.urlOverride?.trim() ?? "";
    const token = props.openworkServerSettings.token?.trim() ?? "";
    const host = hostInfo();
    const perfLogs = props.developerMode ? readPerfLogs(80) : [];
    return {
      capturedAt: new Date().toISOString(),
      runtime: {
        tauri: isTauriRuntime(),
        developerMode: props.developerMode,
      },
      workspace: {
        openworkServerWorkspaceId: props.openworkServerWorkspaceId ?? null,
        clientConnected: props.clientConnected,
        anyActiveRuns: props.anyActiveRuns,
      },
      openworkServer: {
        status: props.openworkServerStatus,
        url: props.openworkServerUrl,
        settings: {
          urlOverride: urlOverride || null,
          tokenPresent: Boolean(token),
        },
        host: host
          ? {
              running: Boolean(host.running),
              baseUrl: host.baseUrl ?? null,
              connectUrl: host.connectUrl ?? null,
              mdnsUrl: host.mdnsUrl ?? null,
              lanUrl: host.lanUrl ?? null,
            }
          : null,
      },
      reload: {
        canReloadWorkspace: props.canReloadWorkspace,
        autoReloadAvailable: props.workspaceAutoReloadAvailable,
        autoReloadEnabled: props.workspaceAutoReloadEnabled,
        autoReloadResumeEnabled: props.workspaceAutoReloadResumeEnabled,
      },
      sharing: {
        hostConnectUrl: hostConnectUrl() || null,
        hostConnectUrlUsesMdns: hostConnectUrlUsesMdns(),
      },
      performance: {
        retainedEntries: perfLogs.length,
        recent: perfLogs,
      },
    };
  });

  const diagnosticsBundleJson = createMemo(() => JSON.stringify(diagnosticsBundle(), null, 2));

  const handleCopy = async (value: string, field: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopyingField(field);
      if (copyTimeout !== undefined) {
        window.clearTimeout(copyTimeout);
      }
      copyTimeout = window.setTimeout(() => {
        setCopyingField(null);
        copyTimeout = undefined;
      }, 2000);
    } catch {
      // ignore
    }
  };

  onCleanup(() => {
    if (copyTimeout !== undefined) {
      window.clearTimeout(copyTimeout);
    }
  });

  return (
    <section class="space-y-6">
      <div class="bg-gray-2/30 border border-gray-6/50 rounded-2xl p-5 space-y-2">
        <div class="text-sm font-medium text-gray-12">{translate("config.workspace_config")}</div>
        <div class="text-xs text-gray-10">
          {translate("config.workspace_config_description")}
        </div>
        <Show when={props.openworkServerWorkspaceId}>
          <div class="text-[11px] text-gray-7 font-mono truncate">
            {translate("config.workspace")}: {props.openworkServerWorkspaceId}
          </div>
        </Show>
      </div>

      <div class="bg-gray-2/30 border border-gray-6/50 rounded-2xl p-5 space-y-4">
        <div>
          <div class="text-sm font-medium text-gray-12">{translate("config.engine_reload")}</div>
          <div class="text-xs text-gray-10">{translate("config.engine_reload_description")}</div>
        </div>

        <div class="flex items-center justify-between bg-gray-1 p-3 rounded-xl border border-gray-6 gap-3">
          <div class="min-w-0 space-y-1">
            <div class="text-sm text-gray-12">{translate("config.reload_now")}</div>
            <div class="text-xs text-gray-7">{translate("config.reload_now_description")}</div>
            <Show when={props.anyActiveRuns}>
              <div class="text-[11px] text-amber-11">{translate("config.reload_warning_active_tasks")}</div>
            </Show>
            <Show when={props.reloadError}>
              <div class="text-[11px] text-red-11">{props.reloadError}</div>
            </Show>
            <Show when={reloadAvailabilityReason()}>
              <div class="text-[11px] text-gray-9">{reloadAvailabilityReason()}</div>
            </Show>
          </div>
          <Button
            variant={reloadButtonTone()}
            class="text-xs h-8 py-0 px-3 shrink-0"
            onClick={props.reloadWorkspaceEngine}
            disabled={reloadButtonDisabled()}
          >
            <RefreshCcw size={14} class={props.reloadBusy ? "animate-spin" : ""} />
            {reloadButtonLabel()}
          </Button>
        </div>

        <div class="flex items-center justify-between bg-gray-1 p-3 rounded-xl border border-gray-6 gap-3">
          <div class="min-w-0 space-y-1">
            <div class="text-sm text-gray-12">{translate("config.auto_reload_local")}</div>
            <div class="text-xs text-gray-7">{translate("config.auto_reload_local_description")}</div>
            <Show when={!props.workspaceAutoReloadAvailable}>
              <div class="text-[11px] text-gray-9">{translate("config.auto_reload_available_desktop_only")}</div>
            </Show>
          </div>
          <Button
            variant="outline"
            class="text-xs h-8 py-0 px-3 shrink-0"
            onClick={() => props.setWorkspaceAutoReloadEnabled(!props.workspaceAutoReloadEnabled)}
            disabled={props.busy || !props.workspaceAutoReloadAvailable}
          >
            {props.workspaceAutoReloadEnabled ? "On" : "Off"}
          </Button>
        </div>

        <div class="flex items-center justify-between bg-gray-1 p-3 rounded-xl border border-gray-6 gap-3">
          <div class="min-w-0 space-y-1">
            <div class="text-sm text-gray-12">{translate("config.auto_reload_resume")}</div>
            <div class="text-xs text-gray-7">
              {translate("config.auto_reload_resume_description")}
            </div>
          </div>
          <Button
            variant="outline"
            class="text-xs h-8 py-0 px-3 shrink-0"
            onClick={() => props.setWorkspaceAutoReloadResumeEnabled(!props.workspaceAutoReloadResumeEnabled)}
            disabled={
              props.busy ||
              !props.workspaceAutoReloadAvailable ||
              !props.workspaceAutoReloadEnabled
            }
            title={props.workspaceAutoReloadEnabled ? "" : translate("config.enable_auto_reload_first")}
          >
            {props.workspaceAutoReloadResumeEnabled ? "On" : "Off"}
          </Button>
        </div>
      </div>

      <Show when={props.developerMode}>
        <div class="bg-gray-2/30 border border-gray-6/50 rounded-2xl p-5 space-y-3">
          <div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <div class="text-sm font-medium text-gray-12">{translate("config.diagnostics_bundle")}</div>
              <div class="text-xs text-gray-10">{translate("config.diagnostics_bundle_description")}</div>
            </div>
            <Button
              variant="secondary"
              class="text-xs h-8 py-0 px-3 shrink-0"
              onClick={() => void handleCopy(diagnosticsBundleJson(), "debug-bundle")}
              disabled={props.busy}
            >
              {copyingField() === "debug-bundle" ? translate("config.copied") : translate("config.copy")}
            </Button>
          </div>
          <pre class="text-xs text-gray-12 whitespace-pre-wrap break-words max-h-64 overflow-auto bg-gray-1/20 border border-gray-6 rounded-xl p-3">
            {diagnosticsBundleJson()}
          </pre>
        </div>
      </Show>

      <Show when={hostInfo()}>
        <div class="bg-gray-2/30 border border-gray-6/50 rounded-2xl p-5 space-y-4">
          <div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <div class="text-sm font-medium text-gray-12">{translate("config.openwork_server_sharing")}</div>
              <div class="text-xs text-gray-10">
                {translate("config.openwork_server_sharing_description")}
              </div>
            </div>
            <div class={`text-xs px-2 py-1 rounded-full border ${hostStatusStyle()}`}>
              {hostStatusLabel()}
            </div>
          </div>

          <div class="grid gap-3">
            <div class="flex items-center justify-between bg-gray-1 p-3 rounded-xl border border-gray-6 gap-3">
              <div class="min-w-0">
                <div class="text-xs font-medium text-gray-11">{translate("config.openwork_server_url")}</div>
                <div class="text-xs text-gray-7 font-mono truncate">{hostConnectUrl() || translate("config.starting_server")}</div>
                <Show when={hostConnectUrl()}>
                  <div class="text-[11px] text-gray-8 mt-1">
                    {hostConnectUrlUsesMdns()
                      ? translate("config.mdns_hint")
                      : translate("config.local_ip_hint")}
                  </div>
                </Show>
              </div>
              <Button
                variant="outline"
                class="text-xs h-8 py-0 px-3 shrink-0"
                onClick={() => handleCopy(hostConnectUrl(), "host-url")}
                disabled={!hostConnectUrl()}
              >
                {copyingField() === "host-url" ? translate("config.copied") : translate("config.copy")}
              </Button>
            </div>

            <div class="flex items-center justify-between bg-gray-1 p-3 rounded-xl border border-gray-6 gap-3">
              <div class="min-w-0">
                <div class="text-xs font-medium text-gray-11">{translate("session.share_access_token")}</div>
                <div class="text-xs text-gray-7 font-mono truncate">
                  {clientTokenVisible()
                    ? hostInfo()?.clientToken || "—"
                    : hostInfo()?.clientToken
                      ? "••••••••••••"
                      : "—"}
                </div>
                <div class="text-[11px] text-gray-8 mt-1">{translate("config.access_token_hint_server")}</div>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  class="text-xs h-8 py-0 px-3"
                  onClick={() => setClientTokenVisible((prev) => !prev)}
                  disabled={!hostInfo()?.clientToken}
                >
                  {clientTokenVisible() ? translate("common.hide") : translate("common.show")}
                </Button>
                <Button
                  variant="outline"
                  class="text-xs h-8 py-0 px-3"
                  onClick={() => handleCopy(hostInfo()?.clientToken ?? "", "client-token")}
                  disabled={!hostInfo()?.clientToken}
                >
                  {copyingField() === "client-token" ? translate("config.copied") : translate("config.copy")}
                </Button>
              </div>
            </div>

            <div class="flex items-center justify-between bg-gray-1 p-3 rounded-xl border border-gray-6 gap-3">
              <div class="min-w-0">
                <div class="text-xs font-medium text-gray-11">{translate("config.server_token")}</div>
                <div class="text-xs text-gray-7 font-mono truncate">
                  {hostTokenVisible()
                    ? hostInfo()?.hostToken || "—"
                    : hostInfo()?.hostToken
                      ? "••••••••••••"
                      : "—"}
                </div>
                <div class="text-[11px] text-gray-8 mt-1">{translate("config.server_token_hint")}</div>
              </div>
              <div class="flex items-center gap-2 shrink-0">
                <Button
                  variant="outline"
                  class="text-xs h-8 py-0 px-3"
                  onClick={() => setHostTokenVisible((prev) => !prev)}
                  disabled={!hostInfo()?.hostToken}
                >
                  {hostTokenVisible() ? translate("common.hide") : translate("common.show")}
                </Button>
                <Button
                  variant="outline"
                  class="text-xs h-8 py-0 px-3"
                  onClick={() => handleCopy(hostInfo()?.hostToken ?? "", "host-token")}
                  disabled={!hostInfo()?.hostToken}
                >
                  {copyingField() === "host-token" ? translate("config.copied") : translate("config.copy")}
                </Button>
              </div>
            </div>
          </div>

          <div class="text-xs text-gray-9">
            {translate("config.workspace_share_links_prefix")} <span class="font-medium">{translate("config.share_ellipsis")}</span> {translate("config.workspace_share_links_suffix")}
          </div>
        </div>
      </Show>

      <div class="bg-gray-2/30 border border-gray-6/50 rounded-2xl p-5 space-y-4">
        <div class="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <div class="text-sm font-medium text-gray-12">{translate("config.openwork_server")}</div>
            <div class="text-xs text-gray-10">
              {translate("config.openwork_server_description")}
            </div>
          </div>
          <div class={`text-xs px-2 py-1 rounded-full border ${openworkStatusStyle()}`}>{openworkStatusLabel()}</div>
        </div>

        <div class="grid gap-3">
          <TextInput
            label={translate("dashboard.openwork_host_label")}
            value={openworkUrl()}
            onInput={(event) => setOpenworkUrl(event.currentTarget.value)}
            placeholder={translate("dashboard.openwork_host_placeholder")}
            hint={translate("dashboard.openwork_host_hint")}
            disabled={props.busy}
          />

          <label class="block">
            <div class="mb-1 text-xs font-medium text-gray-11">{translate("session.share_access_token")}</div>
            <div class="flex items-center gap-2">
              <input
                type={openworkTokenVisible() ? "text" : "password"}
                value={openworkToken()}
                onInput={(event) => setOpenworkToken(event.currentTarget.value)}
                placeholder={translate("dashboard.openwork_host_token_placeholder")}
                disabled={props.busy}
                class="w-full rounded-xl bg-gray-2/60 px-3 py-2 text-sm text-gray-12 placeholder:text-gray-10 shadow-[0_0_0_1px_rgba(255,255,255,0.08)] focus:outline-none focus:ring-2 focus:ring-gray-6/20"
              />
              <Button
                variant="outline"
                class="text-xs h-9 px-3 shrink-0"
                onClick={() => setOpenworkTokenVisible((prev) => !prev)}
                disabled={props.busy}
              >
                {openworkTokenVisible() ? translate("common.hide") : translate("common.show")}
              </Button>
            </div>
            <div class="mt-1 text-xs text-gray-10">{translate("dashboard.openwork_host_token_hint")}</div>
          </label>
        </div>

        <div class="space-y-1">
          <div class="text-[11px] text-gray-7 font-mono truncate">
            {translate("config.resolved_worker_url")}: {resolvedWorkspaceUrl() || translate("identities.not_set")}
          </div>
          <div class="text-[11px] text-gray-8 font-mono truncate">
            {translate("config.worker_id")}: {resolvedWorkspaceId() || translate("config.unavailable")}
          </div>
        </div>

        <div class="flex flex-wrap gap-2">
          <Button
            variant="secondary"
            onClick={async () => {
              if (openworkTestState() === "testing") return;
              const next = buildOpenworkSettings();
              props.updateOpenworkServerSettings(next);
              setOpenworkTestState("testing");
              setOpenworkTestMessage(null);
              try {
                const ok = await props.testOpenworkServerConnection(next);
                setOpenworkTestState(ok ? "success" : "error");
                setOpenworkTestMessage(
                  ok ? translate("config.connection_successful") : translate("config.connection_failed_check_host_token"),
                );
              } catch (error) {
                const message = error instanceof Error ? error.message : translate("config.connection_failed");
                setOpenworkTestState("error");
                setOpenworkTestMessage(message);
              }
            }}
            disabled={props.busy || openworkTestState() === "testing"}
          >
            {openworkTestState() === "testing" ? translate("config.testing") : translate("config.test_connection")}
          </Button>
          <Button
            variant="outline"
            onClick={() => props.updateOpenworkServerSettings(buildOpenworkSettings())}
            disabled={props.busy || !hasOpenworkChanges()}
          >
            {translate("common.save")}
          </Button>
          <Button variant="ghost" onClick={props.resetOpenworkServerSettings} disabled={props.busy}>
            {translate("config.reset")}
          </Button>
        </div>

        <Show when={openworkTestState() !== "idle"}>
          <div
            class={`text-xs ${
              openworkTestState() === "success"
                ? "text-green-11"
                : openworkTestState() === "error"
                  ? "text-red-11"
                  : "text-gray-9"
            }`}
            role="status"
            aria-live="polite"
          >
            {openworkTestState() === "testing"
              ? translate("config.testing_connection")
              : openworkTestMessage() ?? translate("config.connection_status_updated")}
          </div>
        </Show>

        <Show when={openworkStatusLabel() !== translate("dashboard.connected")}>
          <div class="text-xs text-gray-9">{translate("config.connection_needed_sync")}</div>
        </Show>
      </div>

      <div class="bg-gray-2/30 border border-gray-6/50 rounded-2xl p-5 space-y-2">
        <div class="text-sm font-medium text-gray-12">{translate("config.messaging_identities")}</div>
        <div class="text-xs text-gray-10">
          {translate("config.messaging_identities_description_prefix")} <span class="font-medium text-gray-12">{translate("config.identities_tab")}</span> {translate("config.messaging_identities_description_suffix")}
        </div>
      </div>

      <Show when={!isTauriRuntime()}>
        <div class="text-xs text-gray-9">
          {translate("config.desktop_required_hint")}
        </div>
      </Show>
    </section>
  );
}
