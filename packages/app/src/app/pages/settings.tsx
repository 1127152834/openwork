import { For, Match, Show, Switch, createEffect, createMemo, createSignal, onMount } from "solid-js";

import { formatBytes, formatRelativeTime, isTauriRuntime } from "../utils";

import Button from "../components/button";
import { CircleAlert, HardDrive, MessageCircle, PlugZap, RefreshCcw, Smartphone, X, Zap } from "lucide-solid";
import type { OpencodeConnectStatus, ProviderListItem, SettingsTab, StartupPreference } from "../types";
import type {
  OpenworkAuditEntry,
  OpenworkServerCapabilities,
  OpenworkServerDiagnostics,
  OpenworkServerSettings,
  OpenworkServerStatus,
} from "../lib/openwork-server";
import type {
  EngineInfo,
  OrchestratorBinaryInfo,
  OrchestratorStatus,
  OpenworkServerInfo,
  AppBuildInfo,
  OpenCodeRouterInfo,
} from "../lib/tauri";
import {
  appBuildInfo,
  opencodeRouterRestart,
  opencodeRouterStop,
  pickFile,
} from "../lib/tauri";
import { currentLocale, LANGUAGE_OPTIONS, setLocale, t } from "../../i18n";

export type SettingsViewProps = {
  startupPreference: StartupPreference | null;
  baseUrl: string;
  headerStatus: string;
  busy: boolean;
  settingsTab: SettingsTab;
  setSettingsTab: (tab: SettingsTab) => void;
  providers: ProviderListItem[];
  providerConnectedIds: string[];
  providerAuthBusy: boolean;
  openProviderAuthModal: () => Promise<void>;
  openworkServerStatus: OpenworkServerStatus;
  openworkServerUrl: string;
  openworkReconnectBusy: boolean;
  reconnectOpenworkServer: () => Promise<boolean>;
  openworkServerHostInfo: OpenworkServerInfo | null;
  openworkServerCapabilities: OpenworkServerCapabilities | null;
  openworkServerDiagnostics: OpenworkServerDiagnostics | null;
  openworkServerWorkspaceId: string | null;
  openworkAuditEntries: OpenworkAuditEntry[];
  openworkAuditStatus: "idle" | "loading" | "error";
  openworkAuditError: string | null;
  opencodeConnectStatus: OpencodeConnectStatus | null;
  engineInfo: EngineInfo | null;
  orchestratorStatus: OrchestratorStatus | null;
  opencodeRouterInfo: OpenCodeRouterInfo | null;
  developerMode: boolean;
  toggleDeveloperMode: () => void;
  stopHost: () => void;
  restartLocalServer: () => Promise<boolean>;
  engineSource: "path" | "sidecar" | "custom";
  setEngineSource: (value: "path" | "sidecar" | "custom") => void;
  engineCustomBinPath: string;
  setEngineCustomBinPath: (value: string) => void;
  engineRuntime: "direct" | "openwork-orchestrator";
  setEngineRuntime: (value: "direct" | "openwork-orchestrator") => void;
  isWindows: boolean;
  defaultModelLabel: string;
  defaultModelRef: string;
  openDefaultModelPicker: () => void;
  showThinking: boolean;
  toggleShowThinking: () => void;
  hideTitlebar: boolean;
  toggleHideTitlebar: () => void;
  modelVariantLabel: string;
  editModelVariant: () => void;
  themeMode: "light" | "dark" | "system";
  setThemeMode: (value: "light" | "dark" | "system") => void;
  updateAutoCheck: boolean;
  toggleUpdateAutoCheck: () => void;
  updateAutoDownload: boolean;
  toggleUpdateAutoDownload: () => void;
  updateStatus: {
    state: string;
    lastCheckedAt?: number | null;
    version?: string;
    date?: string;
    notes?: string;
    totalBytes?: number | null;
    downloadedBytes?: number;
    message?: string;
  } | null;
  updateEnv: { supported?: boolean; reason?: string | null } | null;
  appVersion: string | null;
  checkForUpdates: () => void;
  downloadUpdate: () => void;
  installUpdateAndRestart: () => void;
  anyActiveRuns: boolean;
  onResetStartupPreference: () => void;
  openResetModal: (mode: "onboarding" | "all") => void;
  resetModalBusy: boolean;
  pendingPermissions: unknown;
  events: unknown;
  workspaceDebugEvents: unknown;
  clearWorkspaceDebugEvents: () => void;
  safeStringify: (value: unknown) => string;
  repairOpencodeMigration: () => void;
  migrationRepairBusy: boolean;
  migrationRepairResult: { ok: boolean; message: string } | null;
  migrationRepairAvailable: boolean;
  migrationRepairUnavailableReason: string | null;
  repairOpencodeCache: () => void;
  cacheRepairBusy: boolean;
  cacheRepairResult: string | null;
  cleanupOpenworkDockerContainers: () => void;
  dockerCleanupBusy: boolean;
  dockerCleanupResult: string | null;
  notionStatus: "disconnected" | "connecting" | "connected" | "error";
  notionStatusDetail: string | null;
  notionError: string | null;
  notionBusy: boolean;
  connectNotion: () => void;
  engineDoctorVersion: string | null;
};

// OpenCodeRouter Settings Component
//
// Messaging identities + routing are managed in the Identities tab.
export function OpenCodeRouterSettings(_props: {
  busy: boolean;
  openworkServerStatus: OpenworkServerStatus;
  openworkServerUrl: string;
  openworkServerSettings: OpenworkServerSettings;
  openworkServerWorkspaceId: string | null;
  openworkServerHostInfo: OpenworkServerInfo | null;
  developerMode: boolean;
}) {
  const translate = (key: string) => t(key, currentLocale());
  return (
    <div class="bg-gray-2/30 border border-gray-6/50 rounded-2xl p-5 space-y-2">
      <div class="flex items-center gap-2">
        <MessageCircle size={16} class="text-gray-11" />
        <div class="text-sm font-medium text-gray-12">{translate("settings.messaging_title")}</div>
      </div>
      <div class="text-xs text-gray-10">
        {translate("settings.messaging_hint_prefix")}
        <span class="font-medium text-gray-12">{translate("settings.identities_tab")}</span>
        {translate("settings.messaging_hint_suffix")}
      </div>
    </div>
  );
}


export default function SettingsView(props: SettingsViewProps) {
  const translate = (key: string) => t(key, currentLocale());
  const translateWithVars = (key: string, vars: Record<string, string | number>) => {
    let message = translate(key);
    for (const [varName, value] of Object.entries(vars)) {
      message = message.replace(new RegExp(`\\{${varName}\\}`, "g"), String(value));
    }
    return message;
  };
  const engineCustomBinPathLabel = () => props.engineCustomBinPath.trim() || translate("settings.no_binary_selected");

  const handlePickEngineBinary = async () => {
    if (!isTauriRuntime()) return;
    try {
      const selected = await pickFile({ title: translate("settings.select_opencode_binary") });
      const path = Array.isArray(selected) ? selected[0] : selected;
      const trimmed = (path ?? "").trim();
      if (!trimmed) return;
      props.setEngineCustomBinPath(trimmed);
      props.setEngineSource("custom");
    } catch {
      // ignore
    }
  };
  const [buildInfo, setBuildInfo] = createSignal<AppBuildInfo | null>(null);
  const updateState = () => props.updateStatus?.state ?? "idle";
  const updateNotes = () => props.updateStatus?.notes ?? null;
  const updateVersion = () => props.updateStatus?.version ?? null;
  const updateDate = () => props.updateStatus?.date ?? null;
  const updateLastCheckedAt = () => props.updateStatus?.lastCheckedAt ?? null;
  const updateDownloadedBytes = () => props.updateStatus?.downloadedBytes ?? null;
  const updateTotalBytes = () => props.updateStatus?.totalBytes ?? null;
  const updateErrorMessage = () => props.updateStatus?.message ?? null;

  const updateDownloadPercent = createMemo<number | null>(() => {
    const total = updateTotalBytes();
    if (total == null || total <= 0) return null;
    const downloaded = updateDownloadedBytes() ?? 0;
    const clamped = Math.max(0, Math.min(1, downloaded / total));
    return Math.floor(clamped * 100);
  });

  const isMacToolbar = createMemo(() => {
    if (props.isWindows) return false;
    if (typeof navigator === "undefined") return false;
    const platform =
      typeof (navigator as any).userAgentData?.platform === "string"
        ? (navigator as any).userAgentData.platform
        : typeof navigator.platform === "string"
          ? navigator.platform
          : "";
    const ua = typeof navigator.userAgent === "string" ? navigator.userAgent : "";
    return /mac/i.test(platform) || /mac/i.test(ua);
  });

  const showUpdateToolbar = createMemo(() => {
    if (!isTauriRuntime()) return false;
    if (props.updateEnv && props.updateEnv.supported === false) return false;
    return isMacToolbar();
  });

  const updateToolbarTone = createMemo(() => {
    switch (updateState()) {
      case "available":
        return "bg-amber-7/10 text-amber-11 border-amber-7/20";
      case "ready":
        return "bg-green-7/10 text-green-11 border-green-7/20";
      case "error":
        return "bg-red-7/10 text-red-11 border-red-7/20";
      case "checking":
      case "downloading":
        return "bg-gray-4/60 text-gray-11 border-gray-7/50";
      default:
        return "bg-gray-4/60 text-gray-11 border-gray-7/50";
    }
  });

  const updateToolbarSpinning = createMemo(() => updateState() === "checking" || updateState() === "downloading");

  const updateToolbarLabel = createMemo(() => {
    const state = updateState();
    const version = updateVersion();
    const versionTag = version ? ` · v${version}` : "";
    if (state === "available") {
      return `${translate("settings.update_toolbar_available")}${versionTag}`;
    }
    if (state === "ready") {
      return `${translate("settings.update_toolbar_ready")}${versionTag}`;
    }
    if (state === "downloading") {
      const downloaded = updateDownloadedBytes() ?? 0;
      const percent = updateDownloadPercent();
      if (percent != null) {
        return translateWithVars("settings.update_toolbar_downloading_percent", { percent });
      }
      return translateWithVars("settings.update_toolbar_downloading_bytes", { downloaded: formatBytes(downloaded) });
    }
    if (state === "checking") {
      return translate("settings.update_toolbar_checking");
    }
    if (state === "error") {
      return translate("settings.update_error");
    }
    return translate("settings.update_uptodate");
  });

  const updateToolbarTitle = createMemo(() => {
    const state = updateState();
    const version = updateVersion();
    if (state !== "downloading") return updateToolbarLabel();

    const downloaded = updateDownloadedBytes() ?? 0;
    const total = updateTotalBytes();
    const percent = updateDownloadPercent();

    if (total != null && percent != null) {
      return translateWithVars("settings.update_toolbar_downloading_detail", {
        downloaded: formatBytes(downloaded),
        total: formatBytes(total),
        percent,
        version: version ? ` · v${version}` : "",
      });
    }

    return translateWithVars("settings.update_toolbar_downloading_simple", {
      downloaded: formatBytes(downloaded),
      version: version ? ` · v${version}` : "",
    });
  });

  const updateToolbarActionLabel = createMemo(() => {
    const state = updateState();
    if (state === "available") return translate("common.download");
    if (state === "ready") return translate("common.install");
    if (state === "error") return translate("common.retry");
    if (state === "idle") return translate("settings.check_update");
    return null;
  });

  const updateToolbarDisabled = createMemo(() => {
    const state = updateState();
    if (state === "checking" || state === "downloading") return true;
    if (state === "ready" && props.anyActiveRuns) return true;
    return props.busy;
  });

  const handleUpdateToolbarAction = () => {
    if (updateToolbarDisabled()) return;
    const state = updateState();
    if (state === "available") {
      props.downloadUpdate();
      return;
    }
    if (state === "ready") {
      props.installUpdateAndRestart();
      return;
    }
    props.checkForUpdates();
  };

  const notionStatusLabel = () => {
    switch (props.notionStatus) {
      case "connected":
        return translate("settings.notion_connected");
      case "connecting":
        return translate("settings.reload_required");
      case "error":
        return translate("settings.connection_failed");
      default:
        return translate("settings.notion_not_connected");
    }
  };

  const notionStatusStyle = () => {
    if (props.notionStatus === "connected") {
      return "bg-green-7/10 text-green-11 border-green-7/20";
    }
    if (props.notionStatus === "error") {
      return "bg-red-7/10 text-red-11 border-red-7/20";
    }
    if (props.notionStatus === "connecting") {
      return "bg-amber-7/10 text-amber-11 border-amber-7/20";
    }
    return "bg-gray-4/60 text-gray-11 border-gray-7/50";
  };

  const [providerConnectError, setProviderConnectError] = createSignal<string | null>(null);
  const [openworkReconnectStatus, setOpenworkReconnectStatus] = createSignal<string | null>(null);
  const [openworkReconnectError, setOpenworkReconnectError] = createSignal<string | null>(null);
  const [openworkRestartBusy, setOpenworkRestartBusy] = createSignal(false);
  const [openworkRestartStatus, setOpenworkRestartStatus] = createSignal<string | null>(null);
  const [openworkRestartError, setOpenworkRestartError] = createSignal<string | null>(null);
  const providerConnectedCount = createMemo(() => (props.providerConnectedIds ?? []).length);
  const providerAvailableCount = createMemo(() => (props.providers ?? []).length);
  const connectedProviderNames = createMemo(() => {
    const connectedIds = props.providerConnectedIds ?? [];
    if (!connectedIds.length) return [] as string[];

    const providersById = new Map((props.providers ?? []).map((provider) => [provider.id, provider]));
    const names = connectedIds
      .map((id) => {
        const provider = providersById.get(id);
        const label = provider?.name?.trim() || provider?.id?.trim() || id.trim();
        return label;
      })
      .filter((name) => name.length > 0);

    return Array.from(new Set(names));
  });
  const providerStatusLabel = createMemo(() => {
    if (!providerAvailableCount()) return translate("status.unavailable");
    if (!providerConnectedCount()) return translate("status.disconnected");
    return translateWithVars("settings.provider_connected_count", { count: providerConnectedCount() });
  });
  const providerStatusStyle = createMemo(() => {
    if (!providerAvailableCount()) return "bg-gray-4/60 text-gray-11 border-gray-7/50";
    if (!providerConnectedCount()) return "bg-amber-7/10 text-amber-11 border-amber-7/20";
    return "bg-green-7/10 text-green-11 border-green-7/20";
  });
  const providerSummary = createMemo(() => {
    if (!providerAvailableCount()) return translate("settings.provider_summary_unavailable");
    const connected = providerConnectedCount();
    const available = providerAvailableCount();
    if (!connected) return translateWithVars("settings.provider_available_count", { count: available });
    return translateWithVars("settings.provider_connected_available_count", { connected, available });
  });

  const handleOpenProviderAuth = async () => {
    if (props.busy || props.providerAuthBusy) return;
    setProviderConnectError(null);
    try {
      await props.openProviderAuthModal();
    } catch (error) {
      const message = error instanceof Error ? error.message : translate("settings.provider_open_failed");
      setProviderConnectError(message);
    }
  };

  const handleReconnectOpenworkServer = async () => {
    if (props.busy || props.openworkReconnectBusy) return;
    if (!props.openworkServerUrl.trim()) return;
    setOpenworkReconnectStatus(null);
    setOpenworkReconnectError(null);
    try {
      const ok = await props.reconnectOpenworkServer();
      if (!ok) {
        setOpenworkReconnectError(translate("settings.reconnect_failed_hint"));
        return;
      }
      setOpenworkReconnectStatus(translate("settings.reconnected_server"));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setOpenworkReconnectError(message || translate("settings.reconnect_server_failed"));
    }
  };

  const handleRestartLocalServer = async () => {
    if (props.busy || openworkRestartBusy()) return;
    setOpenworkRestartStatus(null);
    setOpenworkRestartError(null);
    setOpenworkRestartBusy(true);
    try {
      const ok = await props.restartLocalServer();
      if (!ok) {
        setOpenworkRestartError("Restart failed. Check logs and try again.");
        return;
      }
      setOpenworkRestartStatus("Restarted local server.");
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      setOpenworkRestartError(message || "Failed to restart local server.");
    } finally {
      setOpenworkRestartBusy(false);
    }
  };

  const openworkStatusLabel = createMemo(() => {
    switch (props.openworkServerStatus) {
      case "connected":
        return translate("status.connected");
      case "limited":
        return translate("status.limited");
      default:
        return translate("status.disconnected");
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

  const engineStatusLabel = createMemo(() => {
    if (!isTauriRuntime()) return translate("status.unavailable");
    return props.engineInfo?.running ? translate("status.running") : translate("status.offline");
  });

  const engineStatusStyle = createMemo(() => {
    if (!isTauriRuntime()) return "bg-gray-4/60 text-gray-11 border-gray-7/50";
    return props.engineInfo?.running
      ? "bg-green-7/10 text-green-11 border-green-7/20"
      : "bg-gray-4/60 text-gray-11 border-gray-7/50";
  });

  const opencodeConnectStatusLabel = createMemo(() => {
    const status = props.opencodeConnectStatus?.status;
    if (!status) return translate("status.idle");
    if (status === "connected") return translate("status.connected");
    if (status === "connecting") return translate("status.connecting");
    return translate("status.failed");
  });

  const opencodeConnectStatusStyle = createMemo(() => {
    const status = props.opencodeConnectStatus?.status;
    if (!status) return "bg-gray-4/60 text-gray-11 border-gray-7/50";
    if (status === "connected") return "bg-green-7/10 text-green-11 border-green-7/20";
    if (status === "connecting") return "bg-amber-7/10 text-amber-11 border-amber-7/20";
    return "bg-red-7/10 text-red-11 border-red-7/20";
  });

  const opencodeConnectTimestamp = createMemo(() => {
    const at = props.opencodeConnectStatus?.at;
    if (!at) return null;
    return formatRelativeTime(at);
  });

  const opencodeRouterStatusLabel = createMemo(() => {
    if (!isTauriRuntime()) return translate("status.unavailable");
    return props.opencodeRouterInfo?.running ? translate("status.running") : translate("status.offline");
  });

  const opencodeRouterStatusStyle = createMemo(() => {
    if (!isTauriRuntime()) return "bg-gray-4/60 text-gray-11 border-gray-7/50";
    return props.opencodeRouterInfo?.running
      ? "bg-green-7/10 text-green-11 border-green-7/20"
      : "bg-gray-4/60 text-gray-11 border-gray-7/50";
  });

  const [opencodeRouterRestarting, setOpenCodeRouterRestarting] = createSignal(false);
  const [opencodeRouterRestartError, setOpenCodeRouterRestartError] = createSignal<string | null>(null);

  const handleOpenCodeRouterRestart = async () => {
    if (opencodeRouterRestarting()) return;
    const workspacePath = props.opencodeRouterInfo?.workspacePath?.trim() || props.engineInfo?.projectDir?.trim();
    const opencodeUrl = props.opencodeRouterInfo?.opencodeUrl?.trim() || props.engineInfo?.baseUrl?.trim();
    const opencodeUsername = props.engineInfo?.opencodeUsername?.trim() || undefined;
    const opencodePassword = props.engineInfo?.opencodePassword?.trim() || undefined;
    if (!workspacePath) {
      setOpenCodeRouterRestartError(translate("settings.no_worker_path"));
      return;
    }
    setOpenCodeRouterRestarting(true);
    setOpenCodeRouterRestartError(null);
    try {
      await opencodeRouterRestart({
        workspacePath,
        opencodeUrl: opencodeUrl || undefined,
        opencodeUsername,
        opencodePassword,
      });
    } catch (e) {
      setOpenCodeRouterRestartError(e instanceof Error ? e.message : String(e));
    } finally {
      setOpenCodeRouterRestarting(false);
    }
  };

  const handleOpenCodeRouterStop = async () => {
    if (opencodeRouterRestarting()) return;
    setOpenCodeRouterRestarting(true);
    setOpenCodeRouterRestartError(null);
    try {
      await opencodeRouterStop();
    } catch (e) {
      setOpenCodeRouterRestartError(e instanceof Error ? e.message : String(e));
    } finally {
      setOpenCodeRouterRestarting(false);
    }
  };

  const orchestratorStatusLabel = createMemo(() => {
    if (!props.orchestratorStatus) return translate("status.unavailable");
    return props.orchestratorStatus.running ? translate("status.running") : translate("status.offline");
  });

  const orchestratorStatusStyle = createMemo(() => {
    if (!props.orchestratorStatus) return "bg-gray-4/60 text-gray-11 border-gray-7/50";
    return props.orchestratorStatus.running
      ? "bg-green-7/10 text-green-11 border-green-7/20"
      : "bg-gray-4/60 text-gray-11 border-gray-7/50";
  });

  const openworkAuditStatusLabel = createMemo(() => {
    if (!props.openworkServerWorkspaceId) return translate("status.unavailable");
    if (props.openworkAuditStatus === "loading") return translate("status.loading");
    if (props.openworkAuditStatus === "error") return translate("status.error");
    return translate("status.ready");
  });

  const openworkAuditStatusStyle = createMemo(() => {
    if (!props.openworkServerWorkspaceId) return "bg-gray-4/60 text-gray-11 border-gray-7/50";
    if (props.openworkAuditStatus === "loading") return "bg-amber-7/10 text-amber-11 border-amber-7/20";
    if (props.openworkAuditStatus === "error") return "bg-red-7/10 text-red-11 border-red-7/20";
    return "bg-green-7/10 text-green-11 border-green-7/20";
  });

  const isLocalEngineRunning = createMemo(() => Boolean(props.engineInfo?.running));
  const isLocalPreference = createMemo(() => props.startupPreference === "local");
  const startupLabel = createMemo(() => {
    if (props.startupPreference === "local") return translate("settings.start_local_server");
    if (props.startupPreference === "server") return translate("settings.connect_to_server");
    return translate("settings.not_set");
  });

  const tabLabel = (tab: SettingsTab) => {
    switch (tab) {
      case "model":
        return translate("settings.model_title");
      case "advanced":
        return translate("settings.advanced_title");
      case "debug":
        return translate("settings.debug_title");
      default:
        return translate("settings.general_title");
    }
  };

  const availableTabs = createMemo<SettingsTab[]>(() => {
    const tabs: SettingsTab[] = ["general", "model", "advanced"];
    if (props.developerMode) tabs.push("debug");
    return tabs;
  });

  const activeTab = createMemo<SettingsTab>(() => {
    const tabs = availableTabs();
    return tabs.includes(props.settingsTab) ? props.settingsTab : "general";
  });

  createEffect(() => {
    if (props.settingsTab !== activeTab()) {
      props.setSettingsTab(activeTab());
    }
  });

  const formatActor = (entry: OpenworkAuditEntry) => {
    const actor = entry.actor;
    if (!actor) return translate("settings.audit_actor_unknown");
    if (actor.type === "host") return translate("settings.audit_actor_host");
    if (actor.type === "remote") {
      return actor.clientId
        ? translateWithVars("settings.audit_actor_remote_with_id", { clientId: actor.clientId })
        : translate("settings.audit_actor_remote");
    }
    return translate("settings.audit_actor_unknown");
  };

  const formatCapability = (cap?: { read?: boolean; write?: boolean; source?: string }) => {
    if (!cap) return translate("status.unavailable");
    const parts = [
      cap.read ? translate("settings.capability_read") : null,
      cap.write ? translate("settings.capability_write") : null,
    ]
      .filter(Boolean)
      .join(" / ");
    const label = parts || translate("settings.capability_no_access");
    return cap.source ? `${label} · ${cap.source}` : label;
  };

  const engineStdout = () => {
    if (!isTauriRuntime()) return translate("settings.logs_desktop_only");
    return props.engineInfo?.lastStdout?.trim() || translate("settings.logs_no_stdout");
  };

  const engineStderr = () => {
    if (!isTauriRuntime()) return translate("settings.logs_desktop_only");
    return props.engineInfo?.lastStderr?.trim() || translate("settings.logs_no_stderr");
  };

  const openworkStdout = () => {
    if (!props.openworkServerHostInfo) return translate("settings.logs_host_only");
    return props.openworkServerHostInfo.lastStdout?.trim() || translate("settings.logs_no_stdout");
  };

  const openworkStderr = () => {
    if (!props.openworkServerHostInfo) return translate("settings.logs_host_only");
    return props.openworkServerHostInfo.lastStderr?.trim() || translate("settings.logs_no_stderr");
  };

  const opencodeRouterStdout = () => {
    if (!isTauriRuntime()) return translate("settings.logs_desktop_only");
    return props.opencodeRouterInfo?.lastStdout?.trim() || translate("settings.logs_no_stdout");
  };

  const opencodeRouterStderr = () => {
    if (!isTauriRuntime()) return translate("settings.logs_desktop_only");
    return props.opencodeRouterInfo?.lastStderr?.trim() || translate("settings.logs_no_stderr");
  };

  const formatOrchestratorBinary = (binary?: OrchestratorBinaryInfo | null) => {
    if (!binary) return translate("settings.binary_unavailable");
    const version = binary.actualVersion || binary.expectedVersion || translate("settings.unknown");
    return `${binary.source} · ${version}`;
  };

  const formatOrchestratorBinaryVersion = (binary?: OrchestratorBinaryInfo | null) => {
    if (!binary) return "—";
    return binary.actualVersion || binary.expectedVersion || "—";
  };

  const orchestratorBinaryPath = () => props.orchestratorStatus?.binaries?.opencode?.path ?? "—";
  const orchestratorSidecarSummary = () => {
    const info = props.orchestratorStatus?.sidecar;
    if (!info) return translate("settings.sidecar_config_unavailable");
    const source = info.source ?? translate("settings.auto");
    const target = info.target ?? translate("settings.unknown");
    return `${source} · ${target}`;
  };

  const appVersionLabel = () => (props.appVersion ? `v${props.appVersion}` : "—");
  const appCommitLabel = () => {
    const sha = buildInfo()?.gitSha?.trim();
    if (!sha) return "—";
    return sha.length > 12 ? sha.slice(0, 12) : sha;
  };
  const opencodeVersionLabel = () => {
    const binary = props.orchestratorStatus?.binaries?.opencode ?? null;
    if (binary) return formatOrchestratorBinary(binary);
    return props.engineDoctorVersion ?? "—";
  };
  const openworkServerVersionLabel = () => props.openworkServerDiagnostics?.version ?? "—";
  const opencodeRouterVersionLabel = () => props.opencodeRouterInfo?.version ?? "—";
  const orchestratorVersionLabel = () => props.orchestratorStatus?.cliVersion ?? "—";

  onMount(() => {
    if (!isTauriRuntime()) return;
    void appBuildInfo().then((info) => setBuildInfo(info)).catch(() => setBuildInfo(null));
  });

  const formatUptime = (uptimeMs?: number | null) => {
    if (!uptimeMs) return "—";
    return formatRelativeTime(Date.now() - uptimeMs);
  };

  const compactOutlineActionClass =
    "inline-flex items-center gap-1.5 rounded-md border border-dls-border bg-dls-surface px-3 py-1.5 text-xs font-medium text-dls-secondary shadow-sm transition-colors duration-150 hover:bg-dls-hover hover:text-dls-text focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(var(--dls-accent-rgb),0.25)] disabled:cursor-not-allowed disabled:opacity-60";
  const compactDangerActionClass =
    "inline-flex items-center gap-1.5 rounded-md border border-red-7/35 bg-red-3/25 px-3 py-1.5 text-xs font-medium text-red-11 transition-colors duration-150 hover:border-red-7/50 hover:bg-red-3/45 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-7/35 disabled:cursor-not-allowed disabled:opacity-60";

  return (
    <section class="space-y-6">
      <div class="flex flex-col gap-3 md:flex-row md:items-center md:justify-between rounded-2xl border border-gray-6/40 bg-gray-1/40 px-3 py-2">
        <div class="flex flex-wrap gap-2">
          <For each={availableTabs()}>
            {(tab) => (
              <button
                class={`px-3 py-2 rounded-xl text-xs font-medium border transition-colors ${
                  activeTab() === tab
                    ? "bg-gray-12/10 text-gray-12 border-gray-6/30"
                    : "text-gray-10 border-gray-6/50 hover:text-gray-12 hover:bg-gray-2/40"
                }`}
                onClick={() => props.setSettingsTab(tab)}
              >
                {tabLabel(tab)}
              </button>
            )}
          </For>
        </div>
        <Show when={showUpdateToolbar()}>
          <div class="flex flex-wrap items-center gap-2">
            <div
              class={`text-xs px-2 py-1 rounded-full border flex items-center gap-2 ${updateToolbarTone()}`}
              title={updateToolbarTitle()}
            >
              <Show when={updateToolbarSpinning()}>
                <RefreshCcw size={12} class="animate-spin" />
              </Show>
              <span class="tabular-nums whitespace-nowrap">{updateToolbarLabel()}</span>
            </div>
            <Show when={updateToolbarActionLabel()}>
              <Button
                variant="outline"
                class="text-xs h-8 py-0 px-3 rounded-full border-gray-6/60 bg-gray-1/70 hover:bg-gray-2/70"
                onClick={handleUpdateToolbarAction}
                disabled={updateToolbarDisabled()}
                title={updateState() === "ready" && props.anyActiveRuns ? translate("settings.stop_runs_to_update") : ""}
              >
                {updateToolbarActionLabel()}
              </Button>
            </Show>
          </div>
        </Show>
      </div>

      <Switch>
        <Match when={activeTab() === "general"}>
          <div class="space-y-6">
            <div class="bg-gray-2/30 border border-gray-7/60 rounded-2xl p-5 space-y-4">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <div class="flex items-center gap-2">
                    <PlugZap size={16} class="text-gray-11" />
                    <div class="text-sm font-medium text-gray-12">{translate("settings.providers_title")}</div>
                  </div>
                  <div class="text-xs text-gray-9 mt-1">{translate("settings.providers_hint")}</div>
                </div>
                <div class={`text-xs px-2 py-1 rounded-full border ${providerStatusStyle()}`}>
                  {providerStatusLabel()}
                </div>
              </div>

              <div class="flex flex-wrap items-center gap-3">
                <Button
                  variant="secondary"
                  onClick={handleOpenProviderAuth}
                  disabled={props.busy || props.providerAuthBusy}
                >
                  {props.providerAuthBusy ? translate("settings.loading_providers") : translate("settings.connect_provider")}
                </Button>
                <div class="text-xs text-gray-10">{providerSummary()}</div>
              </div>

              <Show when={connectedProviderNames().length > 0}>
                <div class="flex flex-wrap items-center gap-2">
                  <For each={connectedProviderNames()}>
                    {(name) => (
                      <span class="rounded-full border border-green-7/30 bg-green-3/40 px-2 py-1 text-[11px] font-medium text-green-12">
                        {name}
                      </span>
                    )}
                  </For>
                </div>
              </Show>

              <Show when={providerConnectError()}>
                <div class="rounded-xl border border-red-7/30 bg-red-1/40 px-3 py-2 text-xs text-red-11">
                  {providerConnectError()}
                </div>
              </Show>

              <div class="text-[11px] text-gray-9">
                {translate("settings.providers_storage_prefix")}
                <span class="font-medium">{translate("settings.model_title")}</span>
                {translate("settings.providers_storage_suffix")}
              </div>
            </div>

            <div class="bg-gray-2/30 border border-gray-7/60 rounded-2xl p-5 space-y-4">
              <div>
                <div class="text-sm font-medium text-gray-12">{translate("settings.language")}</div>
                <div class="text-xs text-gray-9">{translate("settings.language.description")}</div>
              </div>

              <div class="flex flex-wrap gap-2">
                <For each={LANGUAGE_OPTIONS}>
                  {(option) => (
                    <Button
                      variant={currentLocale() === option.value ? "secondary" : "outline"}
                      class="text-xs h-8 py-0 px-3"
                      onClick={() => setLocale(option.value)}
                      disabled={props.busy}
                      title={option.label}
                    >
                      {option.nativeName}
                    </Button>
                  )}
                </For>
              </div>
            </div>

            <div class="bg-gray-2/30 border border-gray-7/60 rounded-2xl p-5 space-y-4">
              <div>
                <div class="text-sm font-medium text-gray-12">{translate("settings.appearance_title")}</div>
                <div class="text-xs text-gray-9">{translate("settings.appearance_hint")}</div>
              </div>

              <div class="flex flex-wrap gap-2">
                <Button
                  variant={props.themeMode === "system" ? "secondary" : "outline"}
                  class="text-xs h-8 py-0 px-3"
                  onClick={() => props.setThemeMode("system")}
                  disabled={props.busy}
                >
                  {translate("settings.theme_system")}
                </Button>
                <Button
                  variant={props.themeMode === "light" ? "secondary" : "outline"}
                  class="text-xs h-8 py-0 px-3"
                  onClick={() => props.setThemeMode("light")}
                  disabled={props.busy}
                >
                  {translate("settings.theme_light")}
                </Button>
                <Button
                  variant={props.themeMode === "dark" ? "secondary" : "outline"}
                  class="text-xs h-8 py-0 px-3"
                  onClick={() => props.setThemeMode("dark")}
                  disabled={props.busy}
                >
                  {translate("settings.theme_dark")}
                </Button>
              </div>

              <div class="text-xs text-gray-8">
                {translate("settings.theme_system_hint")}
              </div>
            </div>
          </div>
        </Match>

        <Match when={activeTab() === "model"}>
          <div class="space-y-6">
            <div class="bg-gray-2/30 border border-gray-6/50 rounded-2xl p-5 space-y-4">
              <div>
                <div class="text-sm font-medium text-gray-12">{translate("settings.model_title")}</div>
                <div class="text-xs text-gray-10">{translate("settings.model_hint")}</div>
              </div>

              <div class="flex items-center justify-between bg-gray-1 p-3 rounded-xl border border-gray-6 gap-3">
                <div class="min-w-0">
                  <div class="text-sm text-gray-12 truncate">{props.defaultModelLabel}</div>
                  <div class="text-xs text-gray-7 font-mono truncate">{props.defaultModelRef}</div>
                </div>
                <Button
                  variant="outline"
                  class="text-xs h-8 py-0 px-3 shrink-0"
                  onClick={props.openDefaultModelPicker}
                  disabled={props.busy}
                >
                  {translate("settings.change")}
                </Button>
              </div>

              <div class="flex items-center justify-between bg-gray-1 p-3 rounded-xl border border-gray-6 gap-3">
                <div class="min-w-0">
                  <div class="text-sm text-gray-12">{translate("settings.thinking_label")}</div>
                  <div class="text-xs text-gray-7">{translate("settings.thinking_hint")}</div>
                </div>
                <Button
                  variant="outline"
                  class="text-xs h-8 py-0 px-3 shrink-0"
                  onClick={props.toggleShowThinking}
                  disabled={props.busy}
                >
                  {props.showThinking ? translate("common.on") : translate("common.off")}
                </Button>
              </div>

              <div class="flex items-center justify-between bg-gray-1 p-3 rounded-xl border border-gray-6 gap-3">
                <div class="min-w-0">
                  <div class="text-sm text-gray-12">{translate("settings.model_variant_label")}</div>
                  <div class="text-xs text-gray-7 font-mono truncate">{props.modelVariantLabel}</div>
                </div>
                <Button
                  variant="outline"
                  class="text-xs h-8 py-0 px-3 shrink-0"
                  onClick={props.editModelVariant}
                  disabled={props.busy}
                >
                  {translate("settings.edit")}
                </Button>
              </div>
            </div>
          </div>
        </Match>

        <Match when={activeTab() === "advanced"}>
          <div class="space-y-6">
            <div class="bg-gray-2/30 border border-gray-7/60 rounded-2xl p-5 space-y-3">
              <div class="text-sm font-medium text-gray-12">{translate("settings.developer_mode_title")}</div>
              <div class="text-xs text-gray-9">
                {translate("settings.developer_mode_hint")}
              </div>
              <div class="pt-1 flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  class={`${compactOutlineActionClass} ${
                    props.developerMode
                      ? "border-blue-7/35 bg-blue-3/20 text-blue-11 hover:bg-blue-3/35 hover:text-blue-11"
                      : ""
                  }`}
                  onClick={props.toggleDeveloperMode}
                >
                  <Zap size={14} class={props.developerMode ? "text-blue-10" : "text-dls-secondary"} />
                  {props.developerMode ? translate("settings.disable_developer_mode") : translate("settings.enable_developer_mode")}
                </button>
                <div class="text-xs text-gray-10">
                  {props.developerMode ? translate("settings.developer_panel_enabled") : translate("settings.developer_panel_hint")}
                </div>
              </div>
            </div>

            <div class="bg-gray-2/30 border border-gray-7/60 rounded-2xl p-5 space-y-3">
              <div class="text-sm font-medium text-gray-12">{translate("settings.connection_title")}</div>
              <div class="text-xs text-gray-9">{props.headerStatus}</div>
              <div class="text-xs text-gray-8 font-mono break-all">{props.baseUrl}</div>
              <div class="pt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  class={compactOutlineActionClass}
                  onClick={handleReconnectOpenworkServer}
                  disabled={props.busy || props.openworkReconnectBusy || !props.openworkServerUrl.trim()}
                >
                  <RefreshCcw size={14} class={`text-dls-secondary ${props.openworkReconnectBusy ? "animate-spin" : ""}`} />
                  {props.openworkReconnectBusy ? translate("settings.reconnecting") : translate("settings.reconnect_server")}
                </button>
                <Show when={isLocalEngineRunning()}>
                  <button
                    type="button"
                    class={compactOutlineActionClass}
                    onClick={handleRestartLocalServer}
                    disabled={props.busy || openworkRestartBusy()}
                  >
                    <RefreshCcw size={14} class={`text-dls-secondary ${openworkRestartBusy() ? "animate-spin" : ""}`} />
                    {openworkRestartBusy() ? "Restarting..." : "Restart local server"}
                  </button>
                </Show>
                <Show when={isLocalEngineRunning()}>
                  <button
                    type="button"
                    class={compactDangerActionClass}
                    onClick={props.stopHost}
                    disabled={props.busy}
                  >
                    <CircleAlert size={14} />
                    {translate("settings.stop_local_server")}
                  </button>
                </Show>
                <Show when={!isLocalEngineRunning() && props.openworkServerStatus === "connected"}>
                  <button
                    type="button"
                    class={compactOutlineActionClass}
                    onClick={props.stopHost}
                    disabled={props.busy}
                  >
                    {translate("settings.disconnect_server")}
                  </button>
                </Show>
              </div>
              <Show when={openworkReconnectStatus()}>
                {(value) => <div class="text-xs text-gray-10">{value()}</div>}
              </Show>
              <Show when={openworkReconnectError()}>
                {(value) => <div class="text-xs text-red-11">{value()}</div>}
              </Show>
              <Show when={openworkRestartStatus()}>
                {(value) => <div class="text-xs text-gray-10">{value()}</div>}
              </Show>
              <Show when={openworkRestartError()}>
                {(value) => <div class="text-xs text-red-11">{value()}</div>}
              </Show>
            </div>

            <div class="bg-gray-2/30 border border-gray-7/60 rounded-2xl p-5 space-y-4">
              <div>
                <div class="text-sm font-medium text-gray-12">{translate("settings.migration_recovery_label")}</div>
                <div class="text-xs text-gray-9">{translate("settings.migration_recovery_hint")}</div>
              </div>
              <div class="flex flex-wrap items-center gap-2">
                <Button
                  variant="secondary"
                  class="text-xs h-8 py-0 px-3"
                  onClick={props.repairOpencodeMigration}
                  disabled={props.busy || props.migrationRepairBusy || !props.migrationRepairAvailable}
                  title={props.migrationRepairUnavailableReason ?? ""}
                >
                  {props.migrationRepairBusy
                    ? translate("settings.fixing_migration")
                    : translate("settings.fix_migration")}
                </Button>
              </div>
              <Show when={props.migrationRepairUnavailableReason}>
                {(reason) => <div class="text-xs text-amber-11">{reason()}</div>}
              </Show>
              <Show when={props.migrationRepairBusy}>
                <div class="text-xs text-gray-10">{translate("status.repairing_migration")}</div>
              </Show>
              <Show when={props.migrationRepairResult}>
                {(result) => (
                  <div
                    class={`rounded-xl border px-3 py-2 text-xs ${
                      result().ok
                        ? "border-green-7/30 bg-green-2/30 text-green-12"
                        : "border-red-7/30 bg-red-2/30 text-red-12"
                    }`}
                  >
                    {result().message}
                  </div>
                )}
              </Show>
            </div>

            <div class="bg-gray-2/30 border border-gray-6/50 rounded-2xl p-5 space-y-3">
              <div class="flex items-start justify-between gap-4">
                <div>
                  <div class="text-sm font-medium text-gray-12">{translate("settings.updates_title")}</div>
                  <div class="text-xs text-gray-10">{translate("settings.updates_hint")}</div>
                </div>
                <div class="text-xs text-gray-7 font-mono">{props.appVersion ? `v${props.appVersion}` : ""}</div>
              </div>

              <Show
                when={!isTauriRuntime()}
                fallback={
                  <Show
                    when={props.updateEnv && props.updateEnv.supported === false}
                    fallback={
                      <>
                        <div class="flex items-center justify-between bg-gray-1 p-3 rounded-xl border border-gray-6">
                          <div class="space-y-0.5">
                            <div class="text-sm text-gray-12">{translate("settings.background_checks")}</div>
                            <div class="text-xs text-gray-7">{translate("settings.background_checks_hint")}</div>
                          </div>
                          <button
                            class={`min-w-[70px] px-4 py-1.5 rounded-full text-xs font-medium border shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] transition-colors ${
                              props.updateAutoCheck
                                ? "bg-gray-12/12 text-gray-12 border-gray-6/30"
                                : "bg-gray-1/70 text-gray-10 border-gray-6/60 hover:text-gray-12 hover:bg-gray-2/70"
                            }`}
                            onClick={props.toggleUpdateAutoCheck}
                          >
                            {props.updateAutoCheck ? translate("common.on") : translate("common.off")}
                          </button>
                        </div>

                        <div class="flex items-center justify-between bg-gray-1 p-3 rounded-xl border border-gray-6">
                          <div class="space-y-0.5">
                            <div class="text-sm text-gray-12">{translate("settings.auto_update")}</div>
                            <div class="text-xs text-gray-7">{translate("settings.auto_update_hint")}</div>
                          </div>
                          <button
                            class={`min-w-[70px] px-4 py-1.5 rounded-full text-xs font-medium border shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] transition-colors ${
                              props.updateAutoDownload
                                ? "bg-gray-12/12 text-gray-12 border-gray-6/30"
                                : "bg-gray-1/70 text-gray-10 border-gray-6/60 hover:text-gray-12 hover:bg-gray-2/70"
                            }`}
                            onClick={props.toggleUpdateAutoDownload}
                          >
                            {props.updateAutoDownload ? translate("common.on") : translate("common.off")}
                          </button>
                        </div>

                        <div class="flex items-center justify-between gap-3 bg-gray-1 p-3 rounded-xl border border-gray-6">
                          <div class="space-y-0.5">
                            <div class="text-sm text-gray-12">
                              <Switch>
                                <Match when={updateState() === "checking"}>{translate("settings.update_checking")}</Match>
                                <Match when={updateState() === "available"}>
                                  {translate("settings.update_available")}
                                  {updateVersion()}
                                </Match>
                                <Match when={updateState() === "downloading"}>{translate("settings.update_downloading")}</Match>
                                <Match when={updateState() === "ready"}>
                                  {translate("settings.update_ready")}
                                  {updateVersion()}
                                </Match>
                                <Match when={updateState() === "error"}>{translate("settings.update_error")}</Match>
                                <Match when={true}>{translate("settings.update_uptodate")}</Match>
                              </Switch>
                            </div>
                            <Show when={updateState() === "idle" && updateLastCheckedAt()}>
                              <div class="text-xs text-gray-7">
                                {translateWithVars("settings.last_checked_time", {
                                  time: formatRelativeTime(updateLastCheckedAt() as number),
                                })}
                              </div>
                            </Show>
                            <Show when={updateState() === "available" && updateDate()}>
                              <div class="text-xs text-gray-7">
                                {translateWithVars("settings.published_date", { date: updateDate() ?? "" })}
                              </div>
                            </Show>
                            <Show when={updateState() === "downloading"}>
                              <div class="text-xs text-gray-7">
                                {formatBytes((updateDownloadedBytes() as number) ?? 0)}
                                <Show when={updateTotalBytes() != null}>
                                  {` / ${formatBytes(updateTotalBytes() as number)}`}
                                </Show>
                              </div>
                            </Show>
                            <Show when={updateState() === "error"}>
                              <div class="text-xs text-red-11">{updateErrorMessage()}</div>
                            </Show>
                          </div>

                          <div class="flex items-center gap-2">
                            <Button
                              variant="outline"
                              class="text-xs h-9 py-0 px-4 rounded-full border-gray-6/60 bg-gray-1/70 hover:bg-gray-2/70"
                              onClick={props.checkForUpdates}
                              disabled={props.busy || updateState() === "checking" || updateState() === "downloading"}
                            >
                              {translate("settings.check_update")}
                            </Button>

                            <Show when={updateState() === "available"}>
                              <Button
                                variant="secondary"
                                class="text-xs h-9 py-0 px-4 rounded-full"
                                onClick={props.downloadUpdate}
                                disabled={props.busy || updateState() === "downloading"}
                              >
                                {translate("common.download")}
                              </Button>
                            </Show>

                            <Show when={updateState() === "ready"}>
                              <Button
                                variant="secondary"
                                class="text-xs h-9 py-0 px-4 rounded-full"
                                onClick={props.installUpdateAndRestart}
                                disabled={props.busy || props.anyActiveRuns}
                                title={props.anyActiveRuns ? translate("settings.stop_runs_to_update") : ""}
                              >
                                {translate("settings.install_restart")}
                              </Button>
                            </Show>
                          </div>
                        </div>

                        <Show when={updateState() === "available" && updateNotes()}>
                          <div class="rounded-xl bg-gray-1/20 border border-gray-6 p-3 text-xs text-gray-11 whitespace-pre-wrap max-h-40 overflow-auto">
                            {updateNotes()}
                          </div>
                        </Show>
                      </>
                    }
                  >
                    <div class="rounded-xl bg-gray-1/20 border border-gray-6 p-3 text-sm text-gray-11">
                      {props.updateEnv?.reason ?? translate("settings.updates_not_supported")}
                    </div>
                  </Show>
                }
              >
                <div class="rounded-xl bg-gray-1/20 border border-gray-6 p-3 text-sm text-gray-11">
                  {translate("settings.updates_desktop_only")}
                </div>
              </Show>
            </div>

            <Show when={isTauriRuntime()}>
              <div class="bg-gray-2/30 border border-gray-6/50 rounded-2xl p-5 space-y-3">
                <div>
                  <div class="text-sm font-medium text-gray-12">{translate("settings.appearance_title")}</div>
                  <div class="text-xs text-gray-10">{translate("settings.window_appearance_hint")}</div>
                </div>

                <div class="flex items-center justify-between bg-gray-1 p-3 rounded-xl border border-gray-6 gap-3">
                  <div class="min-w-0">
                    <div class="text-sm text-gray-12">{translate("settings.hide_titlebar_title")}</div>
                    <div class="text-xs text-gray-7">
                      {translate("settings.hide_titlebar_hint")}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    class="text-xs h-8 py-0 px-3 shrink-0"
                    onClick={props.toggleHideTitlebar}
                    disabled={props.busy}
                  >
                    {props.hideTitlebar ? translate("common.on") : translate("common.off")}
                  </Button>
                </div>
              </div>
            </Show>

          </div>
        </Match>

        <Match when={activeTab() === "debug"}>
          <Show when={props.developerMode}>
            <section>
              <h3 class="text-sm font-medium text-gray-11 uppercase tracking-wider mb-4">{translate("settings.developer_title")}</h3>

              <div class="space-y-4">
                <div class="bg-gray-2/30 border border-gray-6/50 rounded-2xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div class="min-w-0">
                    <div class="text-sm text-gray-12">{translate("settings.opencode_cache_label")}</div>
                    <div class="text-xs text-gray-7">
                      {translate("settings.opencode_cache_hint")}
                    </div>
                    <Show when={props.cacheRepairResult}>
                      <div class="text-xs text-gray-11 mt-2">{props.cacheRepairResult}</div>
                    </Show>
                  </div>
                  <Button
                    variant="secondary"
                    class="text-xs h-8 py-0 px-3 shrink-0"
                    onClick={props.repairOpencodeCache}
                    disabled={props.cacheRepairBusy || !isTauriRuntime()}
                    title={isTauriRuntime() ? "" : translate("settings.cache_repair_requires_desktop")}
                  >
                    {props.cacheRepairBusy ? translate("settings.repairing_cache") : translate("settings.repair_cache")}
                  </Button>
                </div>

                <div class="bg-gray-2/30 border border-gray-6/50 rounded-2xl p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                  <div class="min-w-0">
                    <div class="text-sm text-gray-12">{translate("settings.docker_containers_title")}</div>
                    <div class="text-xs text-gray-7">
                      {translate("settings.docker_containers_hint")}
                    </div>
                    <Show when={props.dockerCleanupResult}>
                      <div class="text-xs text-gray-11 mt-2">{props.dockerCleanupResult}</div>
                    </Show>
                  </div>
                  <Button
                    variant="danger"
                    class="text-xs h-8 py-0 px-3 shrink-0"
                    onClick={props.cleanupOpenworkDockerContainers}
                    disabled={props.dockerCleanupBusy || props.anyActiveRuns || !isTauriRuntime()}
                    title={
                      !isTauriRuntime()
                        ? translate("settings.docker_cleanup_requires_desktop")
                        : props.anyActiveRuns
                          ? translate("settings.stop_runs_before_cleanup")
                          : ""
                    }
                  >
                    {props.dockerCleanupBusy ? translate("settings.removing_containers") : translate("settings.delete_containers")}
                  </Button>
                </div>

                <div class="bg-gray-2/30 border border-gray-6/50 rounded-2xl p-5 space-y-3">
                  <div class="text-sm font-medium text-gray-12">{translate("settings.startup_title")}</div>

                  <div class="flex items-center justify-between bg-gray-1 p-3 rounded-xl border border-gray-6">
                    <div class="flex items-center gap-3">
                      <div
                        class={`p-2 rounded-lg ${
                          isLocalPreference() ? "bg-indigo-7/10 text-indigo-11" : "bg-green-7/10 text-green-11"
                        }`}
                      >
                        <Show when={isLocalPreference()} fallback={<Smartphone size={18} />}>
                          <HardDrive size={18} />
                        </Show>
                      </div>
                      <span class="text-sm font-medium text-gray-12">{startupLabel()}</span>
                    </div>
                    <Button
                      variant="outline"
                      class="text-xs h-8 py-0 px-3"
                      onClick={props.stopHost}
                      disabled={props.busy}
                    >
                      {translate("settings.switch_mode")}
                    </Button>
                  </div>

                  <Button
                    variant="secondary"
                    class="w-full justify-between group"
                    onClick={props.onResetStartupPreference}
                  >
                    <span>{translate("settings.reset_startup_label")}</span>
                    <RefreshCcw size={14} class="opacity-80 group-hover:rotate-180 transition-transform" />
                  </Button>

                  <p class="text-xs text-gray-7">
                    {translate("settings.reset_startup_hint")}
                  </p>
                </div>

                <Show when={isTauriRuntime() && (isLocalPreference() || props.developerMode)}>
                  <div class="bg-gray-2/30 border border-gray-6/50 rounded-2xl p-5 space-y-4">
                    <div>
                      <div class="text-sm font-medium text-gray-12">{translate("settings.engine_title")}</div>
                      <div class="text-xs text-gray-10">{translate("settings.engine_hint")}</div>
                    </div>

                    <Show when={!isLocalPreference()}>
                      <div class="text-[11px] text-amber-11 bg-amber-3/40 border border-amber-7/40 rounded-lg px-3 py-2">
                        {translate("settings.engine_remote_startup_hint")}
                      </div>
                    </Show>

                    <div class="space-y-3">
                      <div class="text-xs text-gray-10">{translate("settings.engine_source_label")}</div>
                      <div class={props.developerMode ? "grid grid-cols-3 gap-2" : "grid grid-cols-2 gap-2"}>
                        <Button
                          variant={props.engineSource === "sidecar" ? "secondary" : "outline"}
                          onClick={() => props.setEngineSource("sidecar")}
                          disabled={props.busy}
                        >
                          {translate("settings.engine_source_sidecar_recommended")}
                        </Button>
                        <Button
                          variant={props.engineSource === "path" ? "secondary" : "outline"}
                          onClick={() => props.setEngineSource("path")}
                          disabled={props.busy}
                        >
                          {translate("settings.engine_source_path")}
                        </Button>
                        <Show when={props.developerMode}>
                          <Button
                            variant={props.engineSource === "custom" ? "secondary" : "outline"}
                            onClick={() => props.setEngineSource("custom")}
                            disabled={props.busy}
                          >
                            {translate("settings.engine_source_custom")}
                          </Button>
                        </Show>
                      </div>
                      <div class="text-[11px] text-gray-7">
                        {translate("settings.engine_source_recommendation")}
                      </div>
                    </div>

                    <Show when={props.developerMode && props.engineSource === "custom"}>
                      <div class="space-y-2">
                        <div class="text-xs text-gray-10">{translate("settings.custom_opencode_binary")}</div>
                        <div class="flex items-center gap-2">
                          <div
                            class="flex-1 min-w-0 text-[11px] text-gray-7 font-mono truncate bg-gray-1 p-3 rounded-xl border border-gray-6"
                            title={engineCustomBinPathLabel()}
                          >
                            {engineCustomBinPathLabel()}
                          </div>
                          <Button
                            variant="outline"
                            class="text-xs h-10 px-3 shrink-0"
                            onClick={handlePickEngineBinary}
                            disabled={props.busy}
                          >
                            {translate("common.choose")}
                          </Button>
                          <Button
                            variant="outline"
                            class="text-xs h-10 px-3 shrink-0"
                            onClick={() => props.setEngineCustomBinPath("")}
                            disabled={props.busy || !props.engineCustomBinPath.trim()}
                            title={!props.engineCustomBinPath.trim() ? translate("settings.no_custom_path") : translate("common.clear")}
                          >
                            {translate("common.clear")}
                          </Button>
                        </div>
                        <div class="text-[11px] text-gray-7">
                          {translate("settings.custom_opencode_binary_hint")}
                        </div>
                      </div>
                    </Show>

                    <Show when={props.developerMode}>
                      <div class="space-y-3">
                        <div class="text-xs text-gray-10">{translate("settings.engine_runtime_title")}</div>
                        <div class="grid grid-cols-2 gap-2">
                          <Button
                            variant={props.engineRuntime === "direct" ? "secondary" : "outline"}
                            onClick={() => props.setEngineRuntime("direct")}
                            disabled={props.busy}
                          >
                            {translate("settings.engine_runtime_direct")}
                          </Button>
                          <Button
                            variant={props.engineRuntime === "openwork-orchestrator" ? "secondary" : "outline"}
                            onClick={() => props.setEngineRuntime("openwork-orchestrator")}
                            disabled={props.busy}
                          >
                            {translate("settings.engine_runtime_orchestrator")}
                          </Button>
                        </div>
                        <div class="text-[11px] text-gray-7">{translate("settings.apply_next_engine_start")}</div>
                      </div>
                    </Show>
                  </div>
                </Show>

                <div class="bg-gray-2/30 border border-gray-6/50 rounded-2xl p-5 space-y-4">
                  <div>
                    <div class="text-sm font-medium text-gray-12">{translate("settings.reset_recovery_title")}</div>
                    <div class="text-xs text-gray-10">{translate("settings.reset_recovery_hint")}</div>
                  </div>

                  <div class="flex items-center justify-between bg-gray-1 p-3 rounded-xl border border-gray-6 gap-3">
                    <div class="min-w-0">
                      <div class="text-sm text-gray-12">{translate("settings.reset_onboarding_label")}</div>
                      <div class="text-xs text-gray-7">{translate("settings.reset_onboarding_hint")}</div>
                    </div>
                    <Button
                      variant="outline"
                      class="text-xs h-8 py-0 px-3 shrink-0"
                      onClick={() => props.openResetModal("onboarding")}
                      disabled={props.busy || props.resetModalBusy || props.anyActiveRuns}
                      title={props.anyActiveRuns ? translate("settings.stop_runs_to_reset") : ""}
                    >
                      {translate("settings.reset")}
                    </Button>
                  </div>

                  <div class="flex items-center justify-between bg-gray-1 p-3 rounded-xl border border-gray-6 gap-3">
                    <div class="min-w-0">
                      <div class="text-sm text-gray-12">{translate("settings.reset_app_data_label")}</div>
                      <div class="text-xs text-gray-7">{translate("settings.reset_app_data_hint")}</div>
                    </div>
                    <Button
                      variant="danger"
                      class="text-xs h-8 py-0 px-3 shrink-0"
                      onClick={() => props.openResetModal("all")}
                      disabled={props.busy || props.resetModalBusy || props.anyActiveRuns}
                      title={props.anyActiveRuns ? translate("settings.stop_runs_to_reset") : ""}
                    >
                      {translate("settings.reset")}
                    </Button>
                  </div>

                  <div class="text-xs text-gray-7">
                    {translate("settings.requires_typing")} <span class="font-mono text-gray-11">RESET</span>{" "}
                    {translate("settings.will_restart")}
                  </div>
                </div>

                <div class="bg-gray-2/30 border border-gray-6/50 rounded-2xl p-5 space-y-4">
                  <div>
                    <div class="text-sm font-medium text-gray-12">{translate("settings.devtools_title")}</div>
                    <div class="text-xs text-gray-10">{translate("settings.devtools_hint")}</div>
                  </div>

                  <div class="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    <div class="bg-gray-1 p-4 rounded-xl border border-gray-6 space-y-3">
                      <div>
                        <div class="text-sm font-medium text-gray-12">{translate("settings.versions_title")}</div>
                        <div class="text-xs text-gray-10">{translate("settings.versions_hint")}</div>
                      </div>
                        <div class="space-y-1">
                          <div class="text-[11px] text-gray-7 font-mono truncate">{translate("settings.desktop_app_label")}: {appVersionLabel()}</div>
                          <div class="text-[11px] text-gray-7 font-mono truncate">{translate("settings.commit_label")}: {appCommitLabel()}</div>
                          <div class="text-[11px] text-gray-7 font-mono truncate">{translate("settings.orchestrator_label")}: {orchestratorVersionLabel()}</div>
                          <div class="text-[11px] text-gray-7 font-mono truncate">{translate("settings.opencode_label")}: {opencodeVersionLabel()}</div>
                          <div class="text-[11px] text-gray-7 font-mono truncate">
                            {translate("settings.openwork_server_label")}: {openworkServerVersionLabel()}
                          </div>
                          <div class="text-[11px] text-gray-7 font-mono truncate">{translate("settings.opencode_router_label")}: {opencodeRouterVersionLabel()}</div>
                        </div>
                    </div>

                    <div class="bg-gray-1 p-4 rounded-xl border border-gray-6 space-y-3">
                      <div class="flex items-center justify-between gap-3">
                        <div>
                          <div class="text-sm font-medium text-gray-12">{translate("settings.opencode_engine_title")}</div>
                          <div class="text-xs text-gray-10">{translate("settings.opencode_engine_hint")}</div>
                        </div>
                        <div class={`text-xs px-2 py-1 rounded-full border ${engineStatusStyle()}`}>
                          {engineStatusLabel()}
                        </div>
                      </div>
                      <div class="space-y-1">
                        <div class="text-[11px] text-gray-7 font-mono truncate">
                          {props.engineInfo?.baseUrl ?? translate("settings.base_url_unavailable")}
                        </div>
                        <div class="text-[11px] text-gray-7 font-mono truncate">
                          {props.engineInfo?.projectDir ?? translate("settings.no_project_directory")}
                        </div>
                        <div class="text-[11px] text-gray-7 font-mono truncate">{translate("settings.pid_label")}: {props.engineInfo?.pid ?? "—"}</div>
                      </div>
                      <div class="grid gap-2">
                        <div>
                          <div class="text-[11px] text-gray-9 mb-1">{translate("settings.last_stdout")}</div>
                          <pre class="text-xs text-gray-12 whitespace-pre-wrap break-words max-h-24 overflow-auto bg-gray-2/50 border border-gray-6 rounded-lg p-2">
                            {engineStdout()}
                          </pre>
                        </div>
                        <div>
                          <div class="text-[11px] text-gray-9 mb-1">{translate("settings.last_stderr")}</div>
                          <pre class="text-xs text-gray-12 whitespace-pre-wrap break-words max-h-24 overflow-auto bg-gray-2/50 border border-gray-6 rounded-lg p-2">
                            {engineStderr()}
                          </pre>
                        </div>
                      </div>
                    </div>

                    <div class="bg-gray-1 p-4 rounded-xl border border-gray-6 space-y-3">
                      <div class="flex items-center justify-between gap-3">
                        <div>
                          <div class="text-sm font-medium text-gray-12">{translate("settings.orchestrator_daemon_title")}</div>
                          <div class="text-xs text-gray-10">{translate("settings.orchestrator_daemon_hint")}</div>
                        </div>
                        <div class={`text-xs px-2 py-1 rounded-full border ${orchestratorStatusStyle()}`}>
                          {orchestratorStatusLabel()}
                        </div>
                      </div>
                      <div class="space-y-1">
                        <div class="text-[11px] text-gray-7 font-mono truncate">
                          {props.orchestratorStatus?.dataDir ?? translate("settings.data_directory_unavailable")}
                        </div>
                        <div class="text-[11px] text-gray-7 font-mono truncate">
                          {translate("settings.daemon_label")}: {props.orchestratorStatus?.daemon?.baseUrl ?? "—"}
                        </div>
                        <div class="text-[11px] text-gray-7 font-mono truncate">
                          {translate("settings.opencode_label")}: {props.orchestratorStatus?.opencode?.baseUrl ?? "—"}
                        </div>
                        <div class="text-[11px] text-gray-7 font-mono truncate">
                          {translate("settings.version_label")}: {props.orchestratorStatus?.cliVersion ?? "—"}
                        </div>
                        <div class="text-[11px] text-gray-7 font-mono truncate">
                          {translate("settings.sidecar_label")}: {orchestratorSidecarSummary()}
                        </div>
                        <div class="text-[11px] text-gray-7 font-mono truncate" title={orchestratorBinaryPath()}>
                          {translate("settings.opencode_binary_label")}: {formatOrchestratorBinary(props.orchestratorStatus?.binaries?.opencode ?? null)}
                        </div>
                        <div class="text-[11px] text-gray-7 font-mono truncate">
                          {translate("settings.active_workspace_label")}: {props.orchestratorStatus?.activeId ?? "—"}
                        </div>
                      </div>
                      <Show when={props.orchestratorStatus?.lastError}>
                        <div>
                          <div class="text-[11px] text-gray-9 mb-1">{translate("settings.last_error")}</div>
                          <pre class="text-xs text-gray-12 whitespace-pre-wrap break-words max-h-24 overflow-auto bg-gray-2/50 border border-gray-6 rounded-lg p-2">
                            {props.orchestratorStatus?.lastError}
                          </pre>
                        </div>
                      </Show>
                    </div>

                    <div class="bg-gray-1 p-4 rounded-xl border border-gray-6 space-y-3">
                      <div class="flex items-center justify-between gap-3">
                        <div>
                          <div class="text-sm font-medium text-gray-12">{translate("settings.opencode_sdk_title")}</div>
                          <div class="text-xs text-gray-10">{translate("settings.opencode_sdk_hint")}</div>
                        </div>
                        <div class={`text-xs px-2 py-1 rounded-full border ${opencodeConnectStatusStyle()}`}>
                          {opencodeConnectStatusLabel()}
                        </div>
                      </div>
                      <div class="space-y-1">
                        <div class="text-[11px] text-gray-7 font-mono truncate">
                          {props.opencodeConnectStatus?.baseUrl ?? translate("settings.base_url_unavailable")}
                        </div>
                        <div class="text-[11px] text-gray-7 font-mono truncate">
                          {props.opencodeConnectStatus?.directory ?? translate("settings.no_project_directory")}
                        </div>
                        <div class="text-[11px] text-gray-7">
                          {translate("settings.last_attempt_label")}: {opencodeConnectTimestamp() ?? "—"}
                        </div>
                        <Show when={props.opencodeConnectStatus?.reason}>
                          <div class="text-[11px] text-gray-7">{translate("settings.reason_label")}: {props.opencodeConnectStatus?.reason}</div>
                        </Show>
                        <Show when={props.opencodeConnectStatus?.metrics}>
                          {(metrics) => (
                            <div class="pt-1 space-y-1 text-[11px] text-gray-7">
                              <Show when={metrics().healthyMs != null}>
                                <div>{translate("settings.metric_healthy")}: {Math.round(metrics().healthyMs as number)}ms</div>
                              </Show>
                              <Show when={metrics().loadSessionsMs != null}>
                                <div>{translate("settings.metric_load_sessions")}: {Math.round(metrics().loadSessionsMs as number)}ms</div>
                              </Show>
                              <Show when={metrics().pendingPermissionsMs != null}>
                                <div>
                                  {translate("settings.metric_pending_permissions")}: {Math.round(metrics().pendingPermissionsMs as number)}ms
                                </div>
                              </Show>
                              <Show when={metrics().providersMs != null}>
                                <div>{translate("settings.providers_title")}: {Math.round(metrics().providersMs as number)}ms</div>
                              </Show>
                              <Show when={metrics().totalMs != null}>
                                <div>{translate("settings.metric_total")}: {Math.round(metrics().totalMs as number)}ms</div>
                              </Show>
                            </div>
                          )}
                        </Show>
                      </div>
                      <Show when={props.opencodeConnectStatus?.error}>
                        <div>
                          <div class="text-[11px] text-gray-9 mb-1">{translate("settings.last_error")}</div>
                          <pre class="text-xs text-gray-12 whitespace-pre-wrap break-words max-h-24 overflow-auto bg-gray-2/50 border border-gray-6 rounded-lg p-2">
                            {props.opencodeConnectStatus?.error}
                          </pre>
                        </div>
                      </Show>
                    </div>

                    <div class="bg-gray-1 p-4 rounded-xl border border-gray-6 space-y-3">
                      <div class="flex items-center justify-between gap-3">
                        <div>
                          <div class="text-sm font-medium text-gray-12">{translate("settings.openwork_server_title")}</div>
                          <div class="text-xs text-gray-10">{translate("settings.openwork_server_hint")}</div>
                        </div>
                        <div class={`text-xs px-2 py-1 rounded-full border ${openworkStatusStyle()}`}>
                          {openworkStatusLabel()}
                        </div>
                      </div>
                      <div class="space-y-1">
                        <div class="text-[11px] text-gray-7 font-mono truncate">
                          {(props.openworkServerHostInfo?.baseUrl ?? props.openworkServerUrl) || translate("settings.base_url_unavailable")}
                        </div>
                        <div class="text-[11px] text-gray-7 font-mono truncate">{translate("settings.pid_label")}: {props.openworkServerHostInfo?.pid ?? "—"}</div>
                      </div>
                      <div class="grid gap-2">
                        <div>
                          <div class="text-[11px] text-gray-9 mb-1">{translate("settings.last_stdout")}</div>
                          <pre class="text-xs text-gray-12 whitespace-pre-wrap break-words max-h-24 overflow-auto bg-gray-2/50 border border-gray-6 rounded-lg p-2">
                            {openworkStdout()}
                          </pre>
                        </div>
                        <div>
                          <div class="text-[11px] text-gray-9 mb-1">{translate("settings.last_stderr")}</div>
                          <pre class="text-xs text-gray-12 whitespace-pre-wrap break-words max-h-24 overflow-auto bg-gray-2/50 border border-gray-6 rounded-lg p-2">
                            {openworkStderr()}
                          </pre>
                        </div>
                      </div>
                    </div>

                    <div class="bg-gray-1 p-4 rounded-xl border border-gray-6 space-y-3">
                      <div class="flex items-center justify-between gap-3">
                        <div>
                          <div class="text-sm font-medium text-gray-12">{translate("settings.opencode_router_sidecar_title")}</div>
                          <div class="text-xs text-gray-10">{translate("settings.opencode_router_sidecar_hint")}</div>
                        </div>
                        <div class={`text-xs px-2 py-1 rounded-full border ${opencodeRouterStatusStyle()}`}>
                          {opencodeRouterStatusLabel()}
                        </div>
                      </div>
                      <div class="space-y-1">
                        <div class="text-[11px] text-gray-7 font-mono truncate">
                          {props.opencodeRouterInfo?.opencodeUrl?.trim() || translate("settings.opencode_url_unavailable")}
                        </div>
                        <div class="text-[11px] text-gray-7 font-mono truncate">
                          {props.opencodeRouterInfo?.workspacePath?.trim() || translate("settings.no_worker_directory")}
                        </div>
                        <div class="text-[11px] text-gray-7 font-mono truncate">{translate("settings.pid_label")}: {props.opencodeRouterInfo?.pid ?? "—"}</div>
                      </div>
                      <div class="flex items-center gap-2">
                        <Button
                          variant="secondary"
                          onClick={handleOpenCodeRouterRestart}
                          disabled={opencodeRouterRestarting() || !isTauriRuntime()}
                          class="text-xs px-3 py-1.5"
                        >
                          <RefreshCcw class={`w-3.5 h-3.5 mr-1.5 ${opencodeRouterRestarting() ? "animate-spin" : ""}`} />
                          {opencodeRouterRestarting() ? translate("settings.restarting") : translate("settings.restart")}
                        </Button>
                        <Show when={props.opencodeRouterInfo?.running}>
                          <Button
                            variant="ghost"
                            onClick={handleOpenCodeRouterStop}
                            disabled={opencodeRouterRestarting()}
                            class="text-xs px-3 py-1.5"
                          >
                            {translate("settings.stop")}
                          </Button>
                        </Show>
                      </div>
                      <Show when={opencodeRouterRestartError()}>
                        <div class="text-xs text-red-11 bg-red-3/50 border border-red-6 rounded-lg p-2">
                          {opencodeRouterRestartError()}
                        </div>
                      </Show>
                      <div class="grid gap-2">
                        <div>
                          <div class="text-[11px] text-gray-9 mb-1">{translate("settings.last_stdout")}</div>
                          <pre class="text-xs text-gray-12 whitespace-pre-wrap break-words max-h-24 overflow-auto bg-gray-2/50 border border-gray-6 rounded-lg p-2">
                            {opencodeRouterStdout()}
                          </pre>
                        </div>
                        <div>
                          <div class="text-[11px] text-gray-9 mb-1">{translate("settings.last_stderr")}</div>
                          <pre class="text-xs text-gray-12 whitespace-pre-wrap break-words max-h-24 overflow-auto bg-gray-2/50 border border-gray-6 rounded-lg p-2">
                            {opencodeRouterStderr()}
                          </pre>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div class="bg-gray-1 p-4 rounded-xl border border-gray-6 space-y-3">
                    <div class="flex items-center justify-between gap-3">
                      <div class="text-sm font-medium text-gray-12">{translate("settings.openwork_server_diagnostics_title")}</div>
                      <div class="text-[11px] text-gray-8 font-mono truncate">
                        {props.openworkServerDiagnostics?.version ?? "—"}
                      </div>
                    </div>
                    <Show
                      when={props.openworkServerDiagnostics}
                      fallback={<div class="text-xs text-gray-9">{translate("settings.diagnostics_unavailable")}</div>}
                    >
                      {(diag) => (
                        <div class="grid md:grid-cols-2 gap-2 text-xs text-gray-11">
                          <div>{translate("settings.started_label")}: {formatUptime(diag().uptimeMs)}</div>
                          <div>{translate("settings.read_only_label")}: {diag().readOnly ? translate("settings.true") : translate("settings.false")}</div>
                          <div>
                            {translate("settings.approval_label")}: {diag().approval.mode} ({diag().approval.timeoutMs}ms)
                          </div>
                          <div>{translate("settings.workspaces_label")}: {diag().workspaceCount}</div>
                          <div>{translate("settings.active_workspace_label")}: {diag().activeWorkspaceId ?? "—"}</div>
                          <div>{translate("settings.config_path_label")}: {diag().server.configPath ?? translate("settings.default")}</div>
                          <div>{translate("settings.token_source_label")}: {diag().tokenSource.client}</div>
                          <div>{translate("settings.host_token_source_label")}: {diag().tokenSource.host}</div>
                        </div>
                      )}
                    </Show>
                  </div>

                  <div class="bg-gray-1 p-4 rounded-xl border border-gray-6 space-y-3">
                    <div class="flex items-center justify-between gap-3">
                      <div class="text-sm font-medium text-gray-12">{translate("settings.openwork_server_capabilities_title")}</div>
                      <div class="text-[11px] text-gray-8 font-mono truncate">
                        {props.openworkServerWorkspaceId
                          ? translateWithVars("settings.worker_id", { id: props.openworkServerWorkspaceId })
                          : translate("settings.worker_unresolved")}
                      </div>
                    </div>
                    <Show
                      when={props.openworkServerCapabilities}
                      fallback={<div class="text-xs text-gray-9">{translate("settings.capabilities_unavailable")}</div>}
                    >
                      {(caps) => (
                        <div class="grid md:grid-cols-2 gap-2 text-xs text-gray-11">
                          <div>{translate("settings.skills_label")}: {formatCapability(caps().skills)}</div>
                          <div>{translate("settings.plugins_label")}: {formatCapability(caps().plugins)}</div>
                          <div>{translate("settings.mcp_label")}: {formatCapability(caps().mcp)}</div>
                          <div>{translate("settings.commands_label")}: {formatCapability(caps().commands)}</div>
                          <div>{translate("settings.config_label")}: {formatCapability(caps().config)}</div>
                          <div>{translate("settings.proxy_router_label")}: {caps().proxy?.opencodeRouter ? translate("settings.enabled") : translate("settings.disabled")}</div>
                          <div>
                            {translate("settings.browser_tools_label")}: {(() => {
                              const browser = caps().toolProviders?.browser;
                              if (!browser?.enabled) return translate("settings.disabled");
                              return `${browser.mode} · ${browser.placement}`;
                            })()}
                          </div>
                          <div>
                            {translate("settings.file_tools_label")}: {(() => {
                              const files = caps().toolProviders?.files;
                              if (!files) return translate("status.unavailable");
                              const parts = [
                                files.injection ? translate("settings.inbox_on") : translate("settings.inbox_off"),
                                files.outbox ? translate("settings.outbox_on") : translate("settings.outbox_off"),
                              ];
                              return parts.join(" · ");
                            })()}
                          </div>
                          <div>
                            {translate("settings.sandbox_label")}: {(() => {
                              const sandbox = caps().sandbox;
                              return sandbox
                                ? `${sandbox.backend} (${sandbox.enabled ? translate("common.on") : translate("common.off")})`
                                : translate("status.unavailable");
                            })()}
                          </div>
                        </div>
                      )}
                    </Show>
                  </div>

                  <div class="grid md:grid-cols-2 gap-4">
                    <div class="bg-gray-1 border border-gray-6 rounded-xl p-4">
                      <div class="text-xs text-gray-10 mb-2">{translate("settings.pending_permissions_label")}</div>
                      <pre class="text-xs text-gray-12 whitespace-pre-wrap break-words max-h-64 overflow-auto">
                        {props.safeStringify(props.pendingPermissions)}
                      </pre>
                    </div>
                    <div class="bg-gray-1 border border-gray-6 rounded-xl p-4">
                      <div class="text-xs text-gray-10 mb-2">{translate("settings.recent_events_label")}</div>
                      <pre class="text-xs text-gray-12 whitespace-pre-wrap break-words max-h-64 overflow-auto">
                        {props.safeStringify(props.events)}
                      </pre>
                    </div>
                  </div>

                  <div class="bg-gray-1 border border-gray-6 rounded-xl p-4">
                    <div class="flex items-center justify-between gap-3 mb-2">
                      <div class="text-xs text-gray-10">{translate("settings.workspace_debug_events")}</div>
                      <Button
                        variant="outline"
                        class="text-xs h-7 py-0 px-2 shrink-0"
                        onClick={props.clearWorkspaceDebugEvents}
                        disabled={props.busy}
                      >
                        {translate("common.clear")}
                      </Button>
                    </div>
                    <pre class="text-xs text-gray-12 whitespace-pre-wrap break-words max-h-64 overflow-auto">
                      {props.safeStringify(props.workspaceDebugEvents)}
                    </pre>
                  </div>

                  <div class="bg-gray-1 p-4 rounded-xl border border-gray-6 space-y-3">
                    <div class="flex items-center justify-between gap-3">
                      <div class="text-sm font-medium text-gray-12">{translate("settings.audit_log_title")}</div>
                      <div class={`text-xs px-2 py-1 rounded-full border ${openworkAuditStatusStyle()}`}>
                        {openworkAuditStatusLabel()}
                      </div>
                    </div>
                    <Show when={props.openworkAuditError}>
                      <div class="text-xs text-red-11">{props.openworkAuditError}</div>
                    </Show>
                    <Show
                      when={props.openworkAuditEntries.length > 0}
                      fallback={<div class="text-xs text-gray-9">{translate("settings.no_audit_entries")}</div>}
                    >
                      <div class="divide-y divide-gray-6/50">
                        <For each={props.openworkAuditEntries}>
                          {(entry) => (
                            <div class="flex items-start justify-between gap-4 py-2">
                              <div class="min-w-0">
                                <div class="text-sm text-gray-12 truncate">{entry.summary}</div>
                                <div class="text-[11px] text-gray-9 truncate">
                                  {entry.action} · {entry.target} · {formatActor(entry)}
                                </div>
                              </div>
                              <div class="text-[11px] text-gray-9 whitespace-nowrap">
                                {entry.timestamp ? formatRelativeTime(entry.timestamp) : "—"}
                              </div>
                            </div>
                          )}
                        </For>
                      </div>
                    </Show>
                  </div>
                </div>
              </div>
            </section>
          </Show>
        </Match>
      </Switch>
    </section>
  );
}
