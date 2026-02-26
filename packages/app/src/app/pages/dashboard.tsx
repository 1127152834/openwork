import { Match, Show, Switch, createEffect, createMemo, createSignal, on, onCleanup } from "solid-js";
import type {
  ArtifactItem,
  DashboardTab,
  McpServerEntry,
  McpStatusMap,
  MessageWithParts,
  OpencodeConnectStatus,
  PluginScope,
  ProviderListItem,
  SettingsTab,
  ScheduledJob,
  HubSkillCard,
  SkillCard,
  StartupPreference,
  WorkspaceSessionGroup,
  View,
} from "../types";
import type { McpDirectoryInfo } from "../constants";
import {
  isTauriRuntime,
  normalizeDirectoryPath,
} from "../utils";
import {
  buildOpenworkConnectInviteUrl,
  buildOpenworkWorkspaceBaseUrl,
  createOpenworkServerClient,
  parseOpenworkWorkspaceIdFromUrl,
} from "../lib/openwork-server";
import type {
  OpenworkAuditEntry,
  OpenworkSoulHeartbeatEntry,
  OpenworkSoulStatus,
  OpenworkServerClient,
  OpenworkServerCapabilities,
  OpenworkServerDiagnostics,
  OpenworkWorkspaceExport,
  OpenworkServerSettings,
  OpenworkServerStatus,
} from "../lib/openwork-server";
import type { EngineInfo, OrchestratorStatus, OpenworkServerInfo, OpenCodeRouterInfo, WorkspaceInfo } from "../lib/tauri";
import { DEFAULT_OPENWORK_PUBLISHER_BASE_URL, publishOpenworkBundleJson } from "../lib/publisher";

import Button from "../components/button";
import ExtensionsView from "./extensions";
import ScheduledTasksView from "./scheduled";
import SoulView from "./soul";
import ConfigView from "./config";
import SettingsView from "./settings";
import SkillsView from "./skills";
import IdentitiesView from "./identities";
import StatusBar from "../components/status-bar";
import OpenWorkLogo from "../components/openwork-logo";
import {
  WORKSPACE_CENTER_SURFACE_CLASS,
  WORKSPACE_DRAWER_SURFACE_CLASS,
  WORKSPACE_LEFT_DRAWER_WIDTH_CLASS,
  WORKSPACE_MAIN_CLASS,
  WORKSPACE_ROOT_CLASS,
  WORKSPACE_TOPBAR_CLASS,
  drawerRailClass,
} from "../layout/workspace-shell";
import ProviderAuthModal, { type ProviderOAuthStartResult } from "../components/provider-auth-modal";
import ShareWorkspaceModal from "../components/share-workspace-modal";
import {
  ArrowLeft,
  Box,
  Circle,
  History,
  HeartPulse,
  Loader2,
  MessageCircle,
  SlidersHorizontal,
  X,
  Zap,
} from "lucide-solid";
import { currentLocale, t } from "../../i18n";

export type DashboardViewProps = {
  tab: DashboardTab;
  setTab: (tab: DashboardTab) => void;
  settingsTab: SettingsTab;
  setSettingsTab: (tab: SettingsTab) => void;
  providers: ProviderListItem[];
  providerConnectedIds: string[];
  providerAuthBusy: boolean;
  providerAuthModalOpen: boolean;
  providerAuthError: string | null;
  providerAuthMethods: Record<string, { type: "oauth" | "api"; label: string }[]>;
  openProviderAuthModal: () => Promise<void>;
  closeProviderAuthModal: () => void;
  startProviderAuth: (providerId?: string) => Promise<ProviderOAuthStartResult>;
  completeProviderAuthOAuth: (providerId: string, methodIndex: number, code?: string) => Promise<string | void>;
  submitProviderApiKey: (providerId: string, apiKey: string) => Promise<string | void>;
  view: View;
  setView: (view: View, sessionId?: string) => void;
  startupPreference: StartupPreference | null;
  baseUrl: string;
  clientConnected: boolean;
  busy: boolean;
  busyHint: string | null;
  busyLabel: string | null;
  newTaskDisabled: boolean;
  headerStatus: string;
  error: string | null;
  openworkServerStatus: OpenworkServerStatus;
  openworkServerUrl: string;
  openworkServerClient: OpenworkServerClient | null;
  openworkReconnectBusy: boolean;
  reconnectOpenworkServer: () => Promise<boolean>;
  openworkServerSettings: OpenworkServerSettings;
  openworkServerHostInfo: OpenworkServerInfo | null;
  openworkServerCapabilities: OpenworkServerCapabilities | null;
  openworkServerDiagnostics: OpenworkServerDiagnostics | null;
  openworkServerWorkspaceId: string | null;
  openworkAuditEntries: OpenworkAuditEntry[];
  openworkAuditStatus: "idle" | "loading" | "error";
  openworkAuditError: string | null;
  opencodeConnectStatus: OpencodeConnectStatus | null;
  engineInfo: EngineInfo | null;
  engineDoctorVersion: string | null;
  orchestratorStatus: OrchestratorStatus | null;
  opencodeRouterInfo: OpenCodeRouterInfo | null;
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
  activeWorkspaceDisplay: WorkspaceInfo;
  workspaces: WorkspaceInfo[];
  activeWorkspaceId: string;
  connectingWorkspaceId: string | null;
  activateWorkspace: (workspaceId: string) => Promise<boolean> | boolean | void;
  testWorkspaceConnection: (workspaceId: string) => Promise<boolean> | boolean;
  openCreateWorkspace: () => void;
  openCreateRemoteWorkspace: () => void;
  importWorkspaceConfig: () => void;
  importingWorkspaceConfig: boolean;
  exportWorkspaceConfig: (workspaceId?: string) => void;
  exportWorkspaceBusy: boolean;
  workspaceSessionGroups: WorkspaceSessionGroup[];
  selectedSessionId: string | null;
  openRenameWorkspace: (workspaceId: string) => void;
  editWorkspaceConnection: (workspaceId: string) => void;
  forgetWorkspace: (workspaceId: string) => void;
  stopSandbox: (workspaceId: string) => void;
  scheduledJobs: ScheduledJob[];
  scheduledJobsSource: "local" | "remote";
  scheduledJobsSourceReady: boolean;
  schedulerPluginInstalled: boolean;
  scheduledJobsStatus: string | null;
  scheduledJobsBusy: boolean;
  scheduledJobsUpdatedAt: number | null;
  refreshScheduledJobs: (options?: { force?: boolean }) => void;
  deleteScheduledJob: (name: string) => Promise<void> | void;
  soulStatusByWorkspaceId: Record<string, OpenworkSoulStatus | null>;
  activeSoulStatus: OpenworkSoulStatus | null;
  activeSoulHeartbeats: OpenworkSoulHeartbeatEntry[];
  soulStatusBusy: boolean;
  soulHeartbeatsBusy: boolean;
  soulError: string | null;
  refreshSoulData: (options?: { force?: boolean }) => void;
  runSoulPrompt: (prompt: string) => void;
  activeWorkspaceRoot: string;
  messages: MessageWithParts[];
  artifacts: ArtifactItem[];
  workingFiles: string[];
  refreshSkills: (options?: { force?: boolean }) => void;
  refreshHubSkills: (options?: { force?: boolean }) => void;
  refreshPlugins: (scopeOverride?: PluginScope) => void;
  refreshMcpServers: () => void;
  skills: SkillCard[];
  skillsStatus: string | null;
  hubSkills: HubSkillCard[];
  hubSkillsStatus: string | null;
  skillsAccessHint?: string | null;
  canInstallSkillCreator: boolean;
  canUseDesktopTools: boolean;
  importLocalSkill: () => void;
  installSkillCreator: () => Promise<{ ok: boolean; message: string }>;
  installHubSkill: (name: string) => Promise<{ ok: boolean; message: string }>;
  revealSkillsFolder: () => void;
  uninstallSkill: (name: string) => void;
  readSkill: (name: string) => Promise<{ name: string; path: string; content: string } | null>;
  saveSkill: (input: { name: string; content: string; description?: string }) => void;
  pluginsAccessHint?: string | null;
  canEditPlugins: boolean;
  canUseGlobalPluginScope: boolean;
  pluginScope: PluginScope;
  setPluginScope: (scope: PluginScope) => void;
  pluginConfigPath: string | null;
  pluginList: string[];
  pluginInput: string;
  setPluginInput: (value: string) => void;
  pluginStatus: string | null;
  activePluginGuide: string | null;
  setActivePluginGuide: (value: string | null) => void;
  isPluginInstalled: (name: string, aliases?: string[]) => boolean;
  suggestedPlugins: Array<{
    name: string;
    packageName: string;
    description: string;
    tags: string[];
    aliases?: string[];
    installMode?: "simple" | "guided";
    steps?: Array<{
      title: string;
      description: string;
      command?: string;
      url?: string;
      path?: string;
      note?: string;
    }>;
  }>;
  addPlugin: (pluginNameOverride?: string) => void;
  mcpServers: McpServerEntry[];
  mcpStatus: string | null;
  mcpLastUpdatedAt: number | null;
  mcpStatuses: McpStatusMap;
  mcpConnectingName: string | null;
  selectedMcp: string | null;
  setSelectedMcp: (value: string | null) => void;
  quickConnect: McpDirectoryInfo[];
  connectMcp: (entry: McpDirectoryInfo) => void;
  logoutMcpAuth: (name: string) => Promise<void> | void;
  removeMcp: (name: string) => void;
  showMcpReloadBanner: boolean;
  mcpReloadBlocked: boolean;
  reloadMcpEngine: () => void;
  createSessionAndOpen: () => void;
  setPrompt: (value: string) => void;
  selectSession: (sessionId: string) => Promise<void> | void;
  defaultModelLabel: string;
  defaultModelRef: string;
  openDefaultModelPicker: () => void;
  showThinking: boolean;
  toggleShowThinking: () => void;
  hideTitlebar: boolean;
  toggleHideTitlebar: () => void;
  modelVariantLabel: string;
  editModelVariant: () => void;
  updateAutoCheck: boolean;
  toggleUpdateAutoCheck: () => void;
  updateAutoDownload: boolean;
  toggleUpdateAutoDownload: () => void;
  themeMode: "light" | "dark" | "system";
  setThemeMode: (value: "light" | "dark" | "system") => void;
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
  engineSource: "path" | "sidecar" | "custom";
  setEngineSource: (value: "path" | "sidecar" | "custom") => void;
  engineCustomBinPath: string;
  setEngineCustomBinPath: (value: string) => void;
  engineRuntime: "direct" | "openwork-orchestrator";
  setEngineRuntime: (value: "direct" | "openwork-orchestrator") => void;
  isWindows: boolean;
  toggleDeveloperMode: () => void;
  developerMode: boolean;
  stopHost: () => void;
  restartLocalServer: () => Promise<boolean>;
  openResetModal: (mode: "onboarding" | "all") => void;
  resetModalBusy: boolean;
  onResetStartupPreference: () => void;
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
};

type SharedSkillItem = {
  name: string;
  description?: string;
  content: string;
  trigger?: string;
};

type WorkspaceProfileBundleV1 = {
  schemaVersion: 1;
  type: "workspace-profile";
  name: string;
  description: string;
  workspace: OpenworkWorkspaceExport;
};

type SkillsSetBundleV1 = {
  schemaVersion: 1;
  type: "skills-set";
  name: string;
  description: string;
  skills: SharedSkillItem[];
  sourceWorkspace?: {
    id?: string;
    name?: string;
  };
};

const SESSION_LEFT_DRAWER_OPEN_KEY = "openwork.session.leftDrawerOpen";

const readStoredBoolean = (key: string, fallback = false) => {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (raw == null) return fallback;
    return raw === "1" || raw === "true";
  } catch {
    return fallback;
  }
};

const writeStoredBoolean = (key: string, value: boolean) => {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(key, value ? "1" : "0");
  } catch {
    // Ignore storage errors.
  }
};

export default function DashboardView(props: DashboardViewProps) {
  const translate = (key: string) => t(key, currentLocale());
  const translateWithVars = (key: string, vars: Record<string, string | number>) => {
    const template = translate(key);
    return Object.entries(vars).reduce((acc, [name, value]) => acc.replaceAll(`{${name}}`, String(value)), template);
  };

  const title = createMemo(() => {
    switch (props.tab) {
      case "scheduled":
        return translate("dashboard.title");
      case "soul":
        return translate("dashboard.soul");
      case "skills":
        return translate("dashboard.skills");
      case "plugins":
        return translate("dashboard.extensions");
      case "mcp":
        return translate("dashboard.extensions");
      case "identities":
        return translate("identities.messaging_channels");
      case "config":
        return translate("identities.tab_advanced");
      case "settings":
        return translate("dashboard.settings");
      default:
        return translate("dashboard.title");
    }
  });

  const workspaceLabel = (workspace: WorkspaceInfo) =>
    workspace.displayName?.trim() ||
    workspace.openworkWorkspaceName?.trim() ||
    workspace.name?.trim() ||
    workspace.path?.trim() ||
    translate("skills.worker_fallback");

  // Track last refreshed tab to avoid duplicate calls
  const [lastRefreshedTab, setLastRefreshedTab] = createSignal<string | null>(null);
  const [refreshInProgress, setRefreshInProgress] = createSignal(false);
  const [providerAuthActionBusy, setProviderAuthActionBusy] = createSignal(false);
  const [leftDrawerOpen, setLeftDrawerOpen] = createSignal(
    readStoredBoolean(SESSION_LEFT_DRAWER_OPEN_KEY, true),
  );
  const [shareWorkspaceId, setShareWorkspaceId] = createSignal<string | null>(null);

  createEffect(() => {
    writeStoredBoolean(SESSION_LEFT_DRAWER_OPEN_KEY, leftDrawerOpen());
  });

  const handleProviderAuthSelect = async (providerId: string): Promise<ProviderOAuthStartResult> => {
    if (providerAuthActionBusy()) {
      throw new Error(translate("session.provider_auth_in_progress"));
    }
    setProviderAuthActionBusy(true);
    try {
      return await props.startProviderAuth(providerId);
    } finally {
      setProviderAuthActionBusy(false);
    }
  };

  const handleProviderAuthOAuth = async (providerId: string, methodIndex: number, code?: string) => {
    if (providerAuthActionBusy()) return;
    setProviderAuthActionBusy(true);
    try {
      await props.completeProviderAuthOAuth(providerId, methodIndex, code);
      props.closeProviderAuthModal();
    } catch {
      // Errors are surfaced in the modal.
    } finally {
      setProviderAuthActionBusy(false);
    }
  };

  const handleProviderAuthApiKey = async (providerId: string, apiKey: string) => {
    if (providerAuthActionBusy()) return;
    setProviderAuthActionBusy(true);
    try {
      await props.submitProviderApiKey(providerId, apiKey);
      props.closeProviderAuthModal();
    } catch {
      // Errors are surfaced in the modal.
    } finally {
      setProviderAuthActionBusy(false);
    }
  };

  onCleanup(() => {
    // no-op
  });

  createEffect(() => {
    const currentTab = props.tab;

    // Skip if we already refreshed this tab or a refresh is in progress
    if (lastRefreshedTab() === currentTab || refreshInProgress()) {
      return;
    }

    // Track that we're refreshing this tab
    setRefreshInProgress(true);
    setLastRefreshedTab(currentTab);

    // Use a cancelled flag to prevent stale updates after navigation
    let cancelled = false;

    const doRefresh = async () => {
      try {
        if (currentTab === "skills" && !cancelled) {
          await props.refreshSkills();
        }
        if ((currentTab === "plugins" || currentTab === "mcp") && !cancelled) {
          await Promise.all([props.refreshPlugins(), props.refreshMcpServers()]);
        }
        if (currentTab === "scheduled" && !cancelled) {
          await props.refreshScheduledJobs();
        }
        if (currentTab === "soul" && !cancelled) {
          await props.refreshSoulData();
        }
      } catch {
        // Ignore errors during navigation
      } finally {
        if (!cancelled) {
          setRefreshInProgress(false);
        }
      }
    };

    doRefresh();

    onCleanup(() => {
      cancelled = true;
      setRefreshInProgress(false);
    });
  });

  const soulModeEnabled = createMemo(() => {
    const status = props.soulStatusByWorkspaceId[props.activeWorkspaceId];
    return Boolean(status?.enabled ?? props.activeSoulStatus?.enabled);
  });

  const soulNavIconClass = () => (soulModeEnabled() ? "soul-nav-icon-active" : "");

  const navItem = (t: DashboardTab, label: any, icon: any) => {
    const active = () => props.tab === t || (t === "mcp" && props.tab === "plugins");
    return (
      <button
        class={`w-full h-10 flex items-center gap-3 px-3 rounded-lg text-sm font-medium transition-colors ${
          active()
            ? "bg-dls-active text-dls-text"
            : "text-dls-secondary hover:text-dls-text hover:bg-dls-hover"
        }`}
        onClick={() => props.setTab(t)}
      >
        {icon}
        {label}
      </button>
    );
  };

  const openSettings = (tab: SettingsTab = "general") => {
    props.setSettingsTab(tab);
    props.setTab("settings");
  };
  const backToWorkspace = () => {
    props.setView("session", props.selectedSessionId ?? undefined);
  };

  const openConfig = () => {
    props.setTab(props.developerMode ? "config" : "identities");
  };

  createEffect(() => {
    if (props.developerMode) return;
    if (props.tab !== "config") return;
    props.setTab("identities");
  });

  const shareWorkspace = createMemo(() => {
    const id = shareWorkspaceId();
    if (!id) return null;
    return props.workspaces.find((ws) => ws.id === id) ?? null;
  });

  const shareWorkspaceName = createMemo(() => {
    const ws = shareWorkspace();
    return ws ? workspaceLabel(ws) : "";
  });

  const shareWorkspaceDetail = createMemo(() => {
    const ws = shareWorkspace();
    if (!ws) return "";
    if (ws.workspaceType === "remote") {
      if (ws.remoteType === "openwork") {
        const hostUrl = ws.openworkHostUrl?.trim() || ws.baseUrl?.trim() || "";
        const mounted = buildOpenworkWorkspaceBaseUrl(hostUrl, ws.openworkWorkspaceId);
        return mounted || hostUrl;
      }
      return ws.baseUrl?.trim() || "";
    }
    return ws.path?.trim() || "";
  });

  const [shareLocalOpenworkWorkspaceId, setShareLocalOpenworkWorkspaceId] = createSignal<string | null>(null);
  const [shareWorkspaceProfileBusy, setShareWorkspaceProfileBusy] = createSignal(false);
  const [shareWorkspaceProfileUrl, setShareWorkspaceProfileUrl] = createSignal<string | null>(null);
  const [shareWorkspaceProfileError, setShareWorkspaceProfileError] = createSignal<string | null>(null);
  const [shareSkillsSetBusy, setShareSkillsSetBusy] = createSignal(false);
  const [shareSkillsSetUrl, setShareSkillsSetUrl] = createSignal<string | null>(null);
  const [shareSkillsSetError, setShareSkillsSetError] = createSignal<string | null>(null);

  createEffect(
    on(shareWorkspaceId, () => {
      setShareWorkspaceProfileBusy(false);
      setShareWorkspaceProfileUrl(null);
      setShareWorkspaceProfileError(null);
      setShareSkillsSetBusy(false);
      setShareSkillsSetUrl(null);
      setShareSkillsSetError(null);
    }),
  );

  createEffect(() => {
    const ws = shareWorkspace();
    const baseUrl = props.openworkServerHostInfo?.baseUrl?.trim() ?? "";
    const token = props.openworkServerHostInfo?.clientToken?.trim() ?? "";
    const workspacePath = ws?.workspaceType === "local" ? ws.path?.trim() ?? "" : "";

    if (!ws || ws.workspaceType !== "local" || !workspacePath || !baseUrl || !token) {
      setShareLocalOpenworkWorkspaceId(null);
      return;
    }

    let cancelled = false;
    setShareLocalOpenworkWorkspaceId(null);

    void (async () => {
      try {
        const client = createOpenworkServerClient({ baseUrl, token });
        const response = await client.listWorkspaces();
        if (cancelled) return;
        const items = Array.isArray(response.items) ? response.items : [];
        const targetPath = normalizeDirectoryPath(workspacePath);
        const match = items.find((entry) => normalizeDirectoryPath(entry.path) === targetPath);
        setShareLocalOpenworkWorkspaceId(match?.id ?? null);
      } catch {
        if (!cancelled) setShareLocalOpenworkWorkspaceId(null);
      }
    })();

    onCleanup(() => {
      cancelled = true;
    });
  });

  const shareFields = createMemo(() => {
    const ws = shareWorkspace();
    if (!ws) {
      return [] as Array<{
        label: string;
        value: string;
        secret?: boolean;
        placeholder?: string;
        hint?: string;
      }>;
    }

    if (ws.workspaceType !== "remote") {
      const hostUrl =
        props.openworkServerHostInfo?.connectUrl?.trim() ||
        props.openworkServerHostInfo?.lanUrl?.trim() ||
        props.openworkServerHostInfo?.mdnsUrl?.trim() ||
        props.openworkServerHostInfo?.baseUrl?.trim() ||
        "";
      const mountedUrl = shareLocalOpenworkWorkspaceId()
        ? buildOpenworkWorkspaceBaseUrl(hostUrl, shareLocalOpenworkWorkspaceId())
        : null;
      const url = mountedUrl || hostUrl;
      const token = props.openworkServerHostInfo?.clientToken?.trim() || "";
      const inviteUrl = buildOpenworkConnectInviteUrl({
        workspaceUrl: url,
        token,
      });
      return [
        {
          label: translate("session.share_openwork_invite_link"),
          value: inviteUrl,
          secret: true,
          placeholder: !isTauriRuntime() ? translate("session.desktop_required") : translate("session.starting_server"),
          hint: translate("session.share_invite_link_hint"),
        },
        {
          label: translate("session.share_openwork_worker_url"),
          value: url,
          placeholder: !isTauriRuntime() ? translate("session.desktop_required") : translate("session.starting_server"),
          hint: mountedUrl
            ? translate("session.share_worker_url_hint_worker")
            : hostUrl
              ? translate("session.share_worker_url_hint_fallback")
              : undefined,
        },
        {
          label: translate("session.share_access_token"),
          value: token,
          secret: true,
          placeholder: isTauriRuntime() ? "-" : translate("session.desktop_required"),
          hint: mountedUrl
            ? translate("session.share_access_token_hint_worker")
            : translate("session.share_access_token_hint_host"),
        },
      ];
    }

    if (ws.remoteType === "openwork") {
      const hostUrl = ws.openworkHostUrl?.trim() || ws.baseUrl?.trim() || "";
      const url = buildOpenworkWorkspaceBaseUrl(hostUrl, ws.openworkWorkspaceId) || hostUrl;
      const token =
        ws.openworkToken?.trim() ||
        props.openworkServerSettings.token?.trim() ||
        "";
      const inviteUrl = buildOpenworkConnectInviteUrl({
        workspaceUrl: url,
        token,
      });
      return [
        {
          label: translate("session.share_openwork_invite_link"),
          value: inviteUrl,
          secret: true,
          hint: translate("session.share_invite_link_hint"),
        },
        {
          label: translate("session.share_openwork_worker_url"),
          value: url,
        },
        {
          label: translate("session.share_access_token"),
          value: token,
          secret: true,
          placeholder: token ? undefined : translate("session.share_set_token_in_workspace"),
          hint: translate("session.share_access_token_hint_remote"),
        },
      ];
    }

    const baseUrl = ws.baseUrl?.trim() || ws.path?.trim() || "";
    const directory = ws.directory?.trim() || "";
    return [
      {
        label: translate("session.share_opencode_base_url"),
        value: baseUrl,
      },
      {
        label: translate("session.share_directory"),
        value: directory,
        placeholder: translate("session.share_directory_auto"),
      },
    ];
  });

  const shareNote = createMemo(() => {
    const ws = shareWorkspace();
    if (!ws) return null;
    if (ws.workspaceType === "local" && props.engineInfo?.runtime === "direct") {
      return translate("session.share_note_direct_runtime");
    }
    return null;
  });

  const shareServiceDisabledReason = createMemo(() => {
    const ws = shareWorkspace();
    if (!ws) return translate("session.share_select_worker_first");
    if (ws.workspaceType === "remote" && ws.remoteType !== "openwork") {
      return translate("session.share_openwork_only");
    }
    if (ws.workspaceType !== "remote") {
      const baseUrl = props.openworkServerHostInfo?.baseUrl?.trim() ?? "";
      const token = props.openworkServerHostInfo?.clientToken?.trim() ?? "";
      if (!baseUrl || !token) {
        return translate("session.share_local_host_not_ready");
      }
    } else {
      const hostUrl = ws.openworkHostUrl?.trim() || ws.baseUrl?.trim() || "";
      const token = ws.openworkToken?.trim() || props.openworkServerSettings.token?.trim() || "";
      if (!hostUrl) return translate("session.share_missing_openwork_host_url");
      if (!token) return translate("session.share_missing_openwork_token");
    }
    return null;
  });

  const resolveShareExportContext = async (): Promise<{
    client: OpenworkServerClient;
    workspaceId: string;
    workspace: WorkspaceInfo;
  }> => {
    const ws = shareWorkspace();
    if (!ws) {
      throw new Error(translate("session.share_select_worker_first"));
    }

    if (ws.workspaceType !== "remote") {
      const baseUrl = props.openworkServerHostInfo?.baseUrl?.trim() ?? "";
      const token = props.openworkServerHostInfo?.clientToken?.trim() ?? "";
      if (!baseUrl || !token) {
        throw new Error(translate("session.share_local_host_not_ready"));
      }
      const client = createOpenworkServerClient({ baseUrl, token });

      let workspaceId = shareLocalOpenworkWorkspaceId()?.trim() ?? "";
      if (!workspaceId) {
        const response = await client.listWorkspaces();
        const items = Array.isArray(response.items) ? response.items : [];
        const targetPath = normalizeDirectoryPath(ws.path?.trim() ?? "");
        const match = items.find((entry) => normalizeDirectoryPath(entry.path) === targetPath);
        workspaceId = (match?.id ?? "").trim();
        setShareLocalOpenworkWorkspaceId(workspaceId || null);
      }

      if (!workspaceId) {
        throw new Error(translate("session.share_resolve_local_worker_failed"));
      }

      return { client, workspaceId, workspace: ws };
    }

    if (ws.remoteType !== "openwork") {
      throw new Error(translate("session.share_openwork_only"));
    }

    const hostUrl = ws.openworkHostUrl?.trim() || ws.baseUrl?.trim() || "";
    const token = ws.openworkToken?.trim() || props.openworkServerSettings.token?.trim() || "";
    if (!hostUrl || !token) {
      throw new Error(translate("session.share_host_url_token_required"));
    }

    const client = createOpenworkServerClient({ baseUrl: hostUrl, token });
    let workspaceId =
      ws.openworkWorkspaceId?.trim() ||
      parseOpenworkWorkspaceIdFromUrl(ws.openworkHostUrl ?? "") ||
      parseOpenworkWorkspaceIdFromUrl(ws.baseUrl ?? "") ||
      "";

    if (!workspaceId) {
      const response = await client.listWorkspaces();
      const items = Array.isArray(response.items) ? response.items : [];
      const directoryHint = normalizeDirectoryPath(ws.directory?.trim() ?? ws.path?.trim() ?? "");
      const match = directoryHint
        ? items.find((entry) => {
            const entryPath = normalizeDirectoryPath(
              (entry.opencode?.directory ?? entry.directory ?? entry.path ?? "").trim(),
            );
            return Boolean(entryPath && entryPath === directoryHint);
          })
        : (response.activeId ? items.find((entry) => entry.id === response.activeId) : null) ??
          items[0];
      workspaceId = (match?.id ?? "").trim();
    }

    if (!workspaceId) {
      throw new Error(translate("session.share_resolve_remote_worker_failed"));
    }

    return { client, workspaceId, workspace: ws };
  };

  const publishWorkspaceProfileLink = async () => {
    if (shareWorkspaceProfileBusy()) return;
    setShareWorkspaceProfileBusy(true);
    setShareWorkspaceProfileError(null);
    setShareWorkspaceProfileUrl(null);

    try {
      const { client, workspaceId, workspace } = await resolveShareExportContext();
      const exported = await client.exportWorkspace(workspaceId);
      const payload: WorkspaceProfileBundleV1 = {
        schemaVersion: 1,
        type: "workspace-profile",
        name: `${workspaceLabel(workspace)} profile`,
        description: translate("session.share_workspace_profile_description"),
        workspace: exported,
      };

      const result = await publishOpenworkBundleJson({
        payload,
        bundleType: "workspace-profile",
        name: payload.name,
      });

      setShareWorkspaceProfileUrl(result.url);
      try {
        await navigator.clipboard.writeText(result.url);
      } catch {
        // ignore
      }
    } catch (error) {
      setShareWorkspaceProfileError(
        error instanceof Error ? error.message : translate("session.share_workspace_profile_publish_failed"),
      );
    } finally {
      setShareWorkspaceProfileBusy(false);
    }
  };

  const publishSkillsSetLink = async () => {
    if (shareSkillsSetBusy()) return;
    setShareSkillsSetBusy(true);
    setShareSkillsSetError(null);
    setShareSkillsSetUrl(null);

    try {
      const { client, workspaceId, workspace } = await resolveShareExportContext();
      const exported = await client.exportWorkspace(workspaceId);
      const skills = Array.isArray(exported.skills) ? exported.skills : [];
      if (!skills.length) {
        throw new Error(translate("session.share_no_skills_found"));
      }

      const payload: SkillsSetBundleV1 = {
        schemaVersion: 1,
        type: "skills-set",
        name: `${workspaceLabel(workspace)} skills`,
        description: translate("session.share_skills_set_description"),
        skills: skills.map((skill) => ({
          name: skill.name,
          description: skill.description,
          trigger: skill.trigger,
          content: skill.content,
        })),
        sourceWorkspace: {
          id: workspaceId,
          name: workspaceLabel(workspace),
        },
      };

      const result = await publishOpenworkBundleJson({
        payload,
        bundleType: "skills-set",
        name: payload.name,
      });

      setShareSkillsSetUrl(result.url);
      try {
        await navigator.clipboard.writeText(result.url);
      } catch {
        // ignore
      }
    } catch (error) {
      setShareSkillsSetError(error instanceof Error ? error.message : translate("session.share_skills_set_publish_failed"));
    } finally {
      setShareSkillsSetBusy(false);
    }
  };

  const exportDisabledReason = createMemo(() => {
    const ws = shareWorkspace();
    if (!ws) return translate("dashboard.export_desktop_local_only");
    if (ws.workspaceType === "remote") return translate("dashboard.export_local_only");
    if (!isTauriRuntime()) return translate("dashboard.export_desktop_only");
    if (props.exportWorkspaceBusy) return translate("dashboard.export_running");
    return null;
  });

  const showUpdatePill = createMemo(() => {
    if (!isTauriRuntime()) return false;
    const state = props.updateStatus?.state;
    return state === "available" || state === "downloading" || state === "ready";
  });

  const updateDownloadPercent = createMemo<number | null>(() => {
    const total = props.updateStatus?.totalBytes;
    if (total == null || total <= 0) return null;
    const downloaded = props.updateStatus?.downloadedBytes ?? 0;
    const clamped = Math.max(0, Math.min(1, downloaded / total));
    return Math.floor(clamped * 100);
  });

  const updatePillLabel = createMemo(() => {
    const state = props.updateStatus?.state;
    if (state === "ready") {
      return props.anyActiveRuns ? translate("settings.update_toolbar_ready") : translate("settings.install_update");
    }
    if (state === "downloading") {
      const percent = updateDownloadPercent();
      return percent == null
        ? translateWithVars("settings.update_toolbar_downloading_bytes", { downloaded: "..." })
        : translateWithVars("settings.update_toolbar_downloading_percent", { percent });
    }
    return translate("settings.update_toolbar_available");
  });

  const updatePillButtonTone = createMemo(() => {
    const state = props.updateStatus?.state;
    if (state === "ready") {
      return props.anyActiveRuns
        ? "text-amber-11 hover:text-amber-11 hover:bg-amber-3/30"
        : "text-green-11 hover:text-green-11 hover:bg-green-3/30";
    }
    if (state === "downloading") {
      return "text-blue-11 hover:text-blue-11 hover:bg-blue-3/30";
    }
    return "text-dls-secondary hover:text-emerald-11 hover:bg-emerald-3/25";
  });

  const updatePillBorderTone = createMemo(() => {
    const state = props.updateStatus?.state;
    if (state === "ready") {
      return props.anyActiveRuns ? "border-amber-7/35" : "border-green-7/35";
    }
    if (state === "downloading") {
      return "border-blue-7/35";
    }
    return "border-dls-border";
  });

  const updatePillDotTone = createMemo(() => {
    const state = props.updateStatus?.state;
    if (state === "ready") {
      return props.anyActiveRuns ? "text-amber-10 fill-amber-10" : "text-green-10 fill-green-10";
    }
    if (state === "downloading") {
      return "text-blue-10";
    }
    return "text-emerald-10 fill-emerald-10";
  });

  const updatePillVersionTone = createMemo(() => {
    const state = props.updateStatus?.state;
    if (state === "ready") {
      return props.anyActiveRuns ? "text-amber-11/75" : "text-green-11/75";
    }
    if (state === "downloading") {
      return "text-blue-11/75";
    }
    return "text-dls-secondary";
  });

  const updatePillTitle = createMemo(() => {
    const version = props.updateStatus?.version ? `v${props.updateStatus.version}` : "";
    const state = props.updateStatus?.state;
    if (state === "ready") {
      return props.anyActiveRuns
        ? `${translate("settings.update_toolbar_ready")} ${version}. ${translate("settings.stop_runs_to_update")}.`
        : `${translate("settings.install_update")} ${version}`;
    }
    if (state === "downloading") return `${translate("settings.update_downloading")} ${version}`.trim();
    return `${translate("settings.update_toolbar_available")} ${version}`;
  });

  const handleUpdatePillClick = () => {
    const state = props.updateStatus?.state;
    if (state === "ready" && !props.anyActiveRuns) {
      props.installUpdateAndRestart();
      return;
    }
    openSettings("advanced");
  };

  return (
    <div class={WORKSPACE_ROOT_CLASS}>
      <main class={`${WORKSPACE_MAIN_CLASS} order-2`}>
        <header class={WORKSPACE_TOPBAR_CLASS}>
          <div class="flex items-center gap-3">
            <button
              type="button"
              class="hidden md:flex h-9 w-9 items-center justify-center rounded-lg text-dls-secondary transition-colors hover:text-dls-text hover:bg-dls-hover"
              onClick={() => setLeftDrawerOpen((prev) => !prev)}
              title={translate("session.open_side_panel")}
              aria-label={translate("session.open_side_panel")}
            >
              <SlidersHorizontal size={16} />
            </button>
            <button
              type="button"
              class="h-9 inline-flex items-center gap-2 rounded-lg border border-dls-border px-3 text-sm text-dls-secondary transition-colors hover:text-dls-text hover:bg-dls-hover"
              onClick={backToWorkspace}
              title={translate("dashboard.back_to_workspace")}
              aria-label={translate("dashboard.back_to_workspace")}
            >
              <ArrowLeft size={16} />
              <span class="hidden sm:inline">{translate("dashboard.back_to_workspace")}</span>
            </button>
            <h1 class="text-lg font-medium">{title()}</h1>
            <Show when={showUpdatePill()}>
              <button
                type="button"
                class={`flex items-center gap-1.5 rounded-full border bg-dls-surface px-2.5 py-1 text-xs font-medium shadow-sm transition-colors active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-[rgba(var(--dls-accent-rgb),0.2)] ${updatePillBorderTone()} ${updatePillButtonTone()}`}
                onClick={handleUpdatePillClick}
                title={updatePillTitle()}
                aria-label={updatePillTitle()}
              >
                <Show
                  when={props.updateStatus?.state === "downloading"}
                  fallback={
                    <Circle
                      size={8}
                      class={`${updatePillDotTone()} shrink-0 ${props.updateStatus?.state === "available" ? "animate-pulse" : ""}`}
                    />
                  }
                >
                  <Loader2 size={13} class={`animate-spin shrink-0 ${updatePillDotTone()}`} />
                </Show>
                <span class="text-[11px]">{updatePillLabel()}</span>
                <Show when={props.updateStatus?.version}>
                  {(version) => (
                    <span class={`hidden sm:inline font-mono text-[10px] ${updatePillVersionTone()}`}>v{version()}</span>
                  )}
                </Show>
              </button>
            </Show>
            <div class="px-3 py-1.5 rounded-xl bg-dls-hover text-xs text-dls-secondary font-medium">
              {props.activeWorkspaceDisplay.name}
            </div>
            <Show when={props.activeSoulStatus?.enabled}>
              <div class="inline-flex items-center gap-1 rounded-full border border-rose-7/40 bg-rose-3/40 px-2 py-1 text-[11px] text-rose-11">
                <HeartPulse size={11} />
                {translate("soul.status_soul_on")}
              </div>
            </Show>
            <Show when={props.developerMode}>
              <span class="text-xs text-dls-secondary">{props.headerStatus}</span>
            </Show>
            <Show when={props.busyHint}>
              <span class="text-xs text-dls-secondary">{props.busyHint}</span>
            </Show>
          </div>
        </header>

        <section class={WORKSPACE_CENTER_SURFACE_CLASS}>
        <div class="flex-1 overflow-y-auto">
        <div class="w-full space-y-10 p-4 md:p-6">
          <Switch>
            <Match when={props.tab === "scheduled"}>
              <ScheduledTasksView
                jobs={props.scheduledJobs}
                source={props.scheduledJobsSource}
                sourceReady={props.scheduledJobsSourceReady}
                status={props.scheduledJobsStatus}
                busy={props.scheduledJobsBusy}
                lastUpdatedAt={props.scheduledJobsUpdatedAt}
                refreshJobs={props.refreshScheduledJobs}
                deleteJob={props.deleteScheduledJob}
                isWindows={props.isWindows}
                activeWorkspaceRoot={props.activeWorkspaceRoot}
                createSessionAndOpen={props.createSessionAndOpen}
                setPrompt={props.setPrompt}
                newTaskDisabled={props.newTaskDisabled}
                schedulerInstalled={props.schedulerPluginInstalled}
                canEditPlugins={props.canEditPlugins}
                addPlugin={props.addPlugin}
                reloadWorkspaceEngine={props.reloadWorkspaceEngine}
                reloadBusy={props.reloadBusy}
                canReloadWorkspace={props.canReloadWorkspace}
              />
            </Match>
            <Match when={props.tab === "soul"}>
              <SoulView
                workspaceName={props.activeWorkspaceDisplay.name}
                workspaceRoot={props.activeWorkspaceRoot}
                status={props.activeSoulStatus}
                heartbeats={props.activeSoulHeartbeats}
                loading={props.soulStatusBusy}
                loadingHeartbeats={props.soulHeartbeatsBusy}
                error={props.soulError}
                newTaskDisabled={props.newTaskDisabled}
                refresh={props.refreshSoulData}
                runSoulPrompt={props.runSoulPrompt}
              />
            </Match>
            <Match when={props.tab === "skills"}>
              <SkillsView
                workspaceName={props.activeWorkspaceDisplay.name}
                busy={props.busy}
                canInstallSkillCreator={props.canInstallSkillCreator}
                canUseDesktopTools={props.canUseDesktopTools}
                accessHint={props.skillsAccessHint}
                refreshSkills={props.refreshSkills}
                refreshHubSkills={props.refreshHubSkills}
                skills={props.skills}
                skillsStatus={props.skillsStatus}
                hubSkills={props.hubSkills}
                hubSkillsStatus={props.hubSkillsStatus}
                importLocalSkill={props.importLocalSkill}
                installSkillCreator={props.installSkillCreator}
                installHubSkill={props.installHubSkill}
                revealSkillsFolder={props.revealSkillsFolder}
                uninstallSkill={props.uninstallSkill}
                readSkill={props.readSkill}
                saveSkill={props.saveSkill}
                createSessionAndOpen={props.createSessionAndOpen}
                setPrompt={props.setPrompt}
              />
            </Match>

            <Match when={props.tab === "plugins" || props.tab === "mcp"}>
              <ExtensionsView
                initialSection={props.tab === "plugins" ? "plugins" : "mcp"}
                setDashboardTab={props.setTab}
                busy={props.busy}
                activeWorkspaceRoot={props.activeWorkspaceRoot}
                refreshMcpServers={props.refreshMcpServers}
                mcpServers={props.mcpServers}
                mcpStatus={props.mcpStatus}
                mcpLastUpdatedAt={props.mcpLastUpdatedAt}
                mcpStatuses={props.mcpStatuses}
                mcpConnectingName={props.mcpConnectingName}
                selectedMcp={props.selectedMcp}
                setSelectedMcp={props.setSelectedMcp}
                quickConnect={props.quickConnect}
                connectMcp={props.connectMcp}
                logoutMcpAuth={props.logoutMcpAuth}
                removeMcp={props.removeMcp}
                showMcpReloadBanner={props.showMcpReloadBanner}
                reloadBlocked={props.mcpReloadBlocked}
                reloadMcpEngine={props.reloadMcpEngine}
                canEditPlugins={props.canEditPlugins}
                canUseGlobalScope={props.canUseGlobalPluginScope}
                accessHint={props.pluginsAccessHint}
                pluginScope={props.pluginScope}
                setPluginScope={props.setPluginScope}
                pluginConfigPath={props.pluginConfigPath}
                pluginList={props.pluginList}
                pluginInput={props.pluginInput}
                setPluginInput={props.setPluginInput}
                pluginStatus={props.pluginStatus}
                activePluginGuide={props.activePluginGuide}
                setActivePluginGuide={props.setActivePluginGuide}
                isPluginInstalled={props.isPluginInstalled}
                suggestedPlugins={props.suggestedPlugins}
                refreshPlugins={props.refreshPlugins}
                addPlugin={props.addPlugin}
              />
            </Match>

            <Match when={props.tab === "identities"}>
              <IdentitiesView
                busy={props.busy}
                openworkServerStatus={props.openworkServerStatus}
                openworkServerUrl={props.openworkServerUrl}
                openworkServerClient={props.openworkServerClient}
                openworkReconnectBusy={props.openworkReconnectBusy}
                reconnectOpenworkServer={props.reconnectOpenworkServer}
                openworkServerWorkspaceId={props.openworkServerWorkspaceId}
                activeWorkspaceRoot={props.activeWorkspaceRoot}
                developerMode={props.developerMode}
              />
            </Match>

            <Match when={props.tab === "config" && props.developerMode}>
              <ConfigView
                busy={props.busy}
                clientConnected={props.clientConnected}
                anyActiveRuns={props.anyActiveRuns}
                openworkServerStatus={props.openworkServerStatus}
                openworkServerUrl={props.openworkServerUrl}
                openworkServerSettings={props.openworkServerSettings}
                openworkServerHostInfo={props.openworkServerHostInfo}
                openworkServerWorkspaceId={props.openworkServerWorkspaceId}
                updateOpenworkServerSettings={props.updateOpenworkServerSettings}
                resetOpenworkServerSettings={props.resetOpenworkServerSettings}
                testOpenworkServerConnection={props.testOpenworkServerConnection}
                canReloadWorkspace={props.canReloadWorkspace}
                reloadWorkspaceEngine={props.reloadWorkspaceEngine}
                reloadBusy={props.reloadBusy}
                reloadError={props.reloadError}
                workspaceAutoReloadAvailable={props.workspaceAutoReloadAvailable}
                workspaceAutoReloadEnabled={props.workspaceAutoReloadEnabled}
                setWorkspaceAutoReloadEnabled={props.setWorkspaceAutoReloadEnabled}
                workspaceAutoReloadResumeEnabled={props.workspaceAutoReloadResumeEnabled}
                setWorkspaceAutoReloadResumeEnabled={props.setWorkspaceAutoReloadResumeEnabled}
                developerMode={props.developerMode}
              />
            </Match>

            <Match when={props.tab === "settings"}>
                <SettingsView
                  startupPreference={props.startupPreference}
                  baseUrl={props.baseUrl}
                  headerStatus={props.headerStatus}
                  busy={props.busy}
                  settingsTab={props.settingsTab}
                  setSettingsTab={props.setSettingsTab}
                  providers={props.providers}
                  providerConnectedIds={props.providerConnectedIds}
                  providerAuthBusy={props.providerAuthBusy}
                  openProviderAuthModal={props.openProviderAuthModal}
                  openworkServerStatus={props.openworkServerStatus}
                  openworkServerUrl={props.openworkServerUrl}
                  openworkReconnectBusy={props.openworkReconnectBusy}
                  reconnectOpenworkServer={props.reconnectOpenworkServer}
                  openworkServerHostInfo={props.openworkServerHostInfo}
                  openworkServerCapabilities={props.openworkServerCapabilities}
                  openworkServerDiagnostics={props.openworkServerDiagnostics}
                  openworkServerWorkspaceId={props.openworkServerWorkspaceId}
                  openworkAuditEntries={props.openworkAuditEntries}
                  openworkAuditStatus={props.openworkAuditStatus}
                  openworkAuditError={props.openworkAuditError}
                  opencodeConnectStatus={props.opencodeConnectStatus}
                  engineInfo={props.engineInfo}
                  orchestratorStatus={props.orchestratorStatus}
                  opencodeRouterInfo={props.opencodeRouterInfo}
                  engineDoctorVersion={props.engineDoctorVersion}
                  developerMode={props.developerMode}
                  toggleDeveloperMode={props.toggleDeveloperMode}
                  stopHost={props.stopHost}
                  restartLocalServer={props.restartLocalServer}
                  engineSource={props.engineSource}
                  setEngineSource={props.setEngineSource}
                  engineCustomBinPath={props.engineCustomBinPath}
                  setEngineCustomBinPath={props.setEngineCustomBinPath}
                  engineRuntime={props.engineRuntime}
                  setEngineRuntime={props.setEngineRuntime}
                  isWindows={props.isWindows}
                  defaultModelLabel={props.defaultModelLabel}
                  defaultModelRef={props.defaultModelRef}
                  openDefaultModelPicker={props.openDefaultModelPicker}
                  showThinking={props.showThinking}
                  toggleShowThinking={props.toggleShowThinking}
                  hideTitlebar={props.hideTitlebar}
                  toggleHideTitlebar={props.toggleHideTitlebar}
                  modelVariantLabel={props.modelVariantLabel}
                  editModelVariant={props.editModelVariant}
                  updateAutoCheck={props.updateAutoCheck}
                  toggleUpdateAutoCheck={props.toggleUpdateAutoCheck}
                  updateAutoDownload={props.updateAutoDownload}
                  toggleUpdateAutoDownload={props.toggleUpdateAutoDownload}
                  themeMode={props.themeMode}
                  setThemeMode={props.setThemeMode}
                  updateStatus={props.updateStatus}
                  updateEnv={props.updateEnv}
                  appVersion={props.appVersion}
                  checkForUpdates={props.checkForUpdates}
                  downloadUpdate={props.downloadUpdate}
                  installUpdateAndRestart={props.installUpdateAndRestart}
                  anyActiveRuns={props.anyActiveRuns}
                  onResetStartupPreference={props.onResetStartupPreference}
                  openResetModal={props.openResetModal}
                  resetModalBusy={props.resetModalBusy}
                  pendingPermissions={props.pendingPermissions}
                  events={props.events}
                  workspaceDebugEvents={props.workspaceDebugEvents}
                  clearWorkspaceDebugEvents={props.clearWorkspaceDebugEvents}
                  safeStringify={props.safeStringify}
                  repairOpencodeMigration={props.repairOpencodeMigration}
                  migrationRepairBusy={props.migrationRepairBusy}
                  migrationRepairResult={props.migrationRepairResult}
                  migrationRepairAvailable={props.migrationRepairAvailable}
                  migrationRepairUnavailableReason={props.migrationRepairUnavailableReason}
                  repairOpencodeCache={props.repairOpencodeCache}
                  cacheRepairBusy={props.cacheRepairBusy}
                  cacheRepairResult={props.cacheRepairResult}
                  cleanupOpenworkDockerContainers={props.cleanupOpenworkDockerContainers}
                  dockerCleanupBusy={props.dockerCleanupBusy}
                  dockerCleanupResult={props.dockerCleanupResult}
                  notionStatus={props.notionStatus}
                  notionStatusDetail={props.notionStatusDetail}
                  notionError={props.notionError}
                  notionBusy={props.notionBusy}
                  connectNotion={props.connectNotion}
                />

            </Match>
          </Switch>
        </div>

        <Show when={props.error}>
          <div class="mx-auto max-w-5xl px-6 md:px-10 pb-24 md:pb-10">
            <div class="rounded-2xl bg-red-1/40 px-5 py-4 text-sm text-red-12 border border-red-7/20 space-y-3">
              <div>{props.error}</div>
              <Show when={props.developerMode}>
                <div class="flex flex-wrap items-center gap-2">
                  <Button
                    variant="secondary"
                    class="text-xs h-8 py-0 px-3"
                    onClick={props.repairOpencodeCache}
                    disabled={props.cacheRepairBusy || !props.developerMode}
                  >
                    {props.cacheRepairBusy ? translate("dashboard.repairing_cache") : translate("dashboard.repair_cache")}
                  </Button>
                  <Button
                    variant="outline"
                    class="text-xs h-8 py-0 px-3"
                    onClick={props.stopHost}
                    disabled={props.busy}
                  >
                    Retry
                  </Button>
                  <Show when={props.cacheRepairResult}>
                    <span class="text-xs text-red-12/80">
                      {props.cacheRepairResult}
                    </span>
                  </Show>
                </div>
              </Show>
            </div>
          </div>
        </Show>

        <ProviderAuthModal
          open={props.providerAuthModalOpen}
          loading={props.providerAuthBusy}
          submitting={providerAuthActionBusy()}
          error={props.providerAuthError}
          providers={props.providers}
          connectedProviderIds={props.providerConnectedIds}
          authMethods={props.providerAuthMethods}
          onSelect={handleProviderAuthSelect}
          onSubmitApiKey={handleProviderAuthApiKey}
          onSubmitOAuth={handleProviderAuthOAuth}
          onClose={props.closeProviderAuthModal}
        />

        <ShareWorkspaceModal
          open={Boolean(shareWorkspaceId())}
          onClose={() => setShareWorkspaceId(null)}
          workspaceName={shareWorkspaceName()}
          workspaceDetail={shareWorkspaceDetail()}
          fields={shareFields()}
          note={shareNote()}
          publisherBaseUrl={DEFAULT_OPENWORK_PUBLISHER_BASE_URL}
          onShareWorkspaceProfile={publishWorkspaceProfileLink}
          shareWorkspaceProfileBusy={shareWorkspaceProfileBusy()}
          shareWorkspaceProfileUrl={shareWorkspaceProfileUrl()}
          shareWorkspaceProfileError={shareWorkspaceProfileError()}
          shareWorkspaceProfileDisabledReason={shareServiceDisabledReason()}
          onShareSkillsSet={publishSkillsSetLink}
          shareSkillsSetBusy={shareSkillsSetBusy()}
          shareSkillsSetUrl={shareSkillsSetUrl()}
          shareSkillsSetError={shareSkillsSetError()}
          shareSkillsSetDisabledReason={shareServiceDisabledReason()}
          onExportConfig={
            exportDisabledReason()
              ? undefined
              : () => {
                const id = shareWorkspaceId();
                if (!id) return;
                props.exportWorkspaceConfig(id);
              }
          }
          exportDisabledReason={exportDisabledReason()}
          onOpenBots={openConfig}
        />
        </div>
        </section>
        <nav class="md:hidden">
          <div class={`mx-auto max-w-5xl px-4 py-3 grid gap-2 ${props.developerMode ? "grid-cols-6" : "grid-cols-5"}`}>
            <button
              class={`flex flex-col items-center gap-1 text-xs ${
                props.tab === "scheduled" ? "text-gray-12" : "text-gray-10"
              }`}
              onClick={() => props.setTab("scheduled")}
            >
              <History size={18} />
              {translate("dashboard.automations")}
            </button>
            <button
              class={`flex flex-col items-center gap-1 text-xs ${
                props.tab === "soul" ? "text-gray-12" : "text-gray-10"
              }`}
              onClick={() => props.setTab("soul")}
            >
              <HeartPulse size={18} class={soulNavIconClass()} />
              {translate("dashboard.soul")}
            </button>
            <button
              class={`flex flex-col items-center gap-1 text-xs ${
                props.tab === "skills" ? "text-gray-12" : "text-gray-10"
              }`}
              onClick={() => props.setTab("skills")}
            >
              <Zap size={18} />
              {translate("dashboard.skills")}
            </button>
            <button
              class={`flex flex-col items-center gap-1 text-xs ${
                props.tab === "mcp" || props.tab === "plugins" ? "text-gray-12" : "text-gray-10"
              }`}
              onClick={() => props.setTab("mcp")}
            >
              <Box size={18} />
              {translate("dashboard.extensions")}
            </button>
            <button
              class={`flex flex-col items-center gap-1 text-xs ${
                props.tab === "identities" ? "text-gray-12" : "text-gray-10"
              }`}
              onClick={() => props.setTab("identities")}
            >
              <MessageCircle size={18} />
              {translate("dashboard.messaging")}
            </button>
            <Show when={props.developerMode}>
              <button
                class={`flex flex-col items-center gap-1 text-xs ${
                  props.tab === "config" ? "text-gray-12" : "text-gray-10"
                }`}
                onClick={() => props.setTab("config")}
              >
                <SlidersHorizontal size={18} />
                {translate("identities.tab_advanced")}
              </button>
            </Show>
          </div>
        </nav>
      </main>

      <div class={`hidden md:block order-1 ${drawerRailClass(leftDrawerOpen(), "left", WORKSPACE_LEFT_DRAWER_WIDTH_CLASS)}`}>
      <aside class={`${WORKSPACE_DRAWER_SURFACE_CLASS} flex h-full flex-col p-4`}>
        <div class="h-full flex flex-col">
          <div class="flex items-center justify-between gap-2 pb-2 border-b border-dls-border">
            <button
              type="button"
              class="inline-flex min-w-0 max-w-[150px] items-center gap-2 rounded-lg border border-dls-border/70 bg-dls-surface/70 px-2 py-1 text-dls-secondary transition-colors hover:text-dls-text hover:bg-dls-hover"
              onClick={backToWorkspace}
              title={translate("dashboard.back_to_workspace")}
              aria-label={translate("dashboard.back_to_workspace")}
            >
              <OpenWorkLogo size={16} />
              <span class="truncate text-xs font-medium text-dls-text">{workspaceLabel(props.activeWorkspaceDisplay)}</span>
            </button>
            <button
              type="button"
              class="h-8 w-8 rounded-md text-dls-secondary hover:text-dls-text hover:bg-dls-hover transition-colors"
              onClick={() => setLeftDrawerOpen(false)}
              aria-label={translate("common.close")}
            >
              <X size={16} />
            </button>
          </div>
          <div class="flex-1 overflow-y-auto space-y-1 pt-3">
            {navItem("scheduled", translate("dashboard.automations"), <History size={18} />)}
            {navItem("soul", translate("dashboard.soul"), <HeartPulse size={18} class={soulNavIconClass()} />)}
            {navItem("skills", translate("dashboard.skills"), <Zap size={18} />)}
            {navItem("mcp", translate("dashboard.extensions"), <Box size={18} />)}
            {navItem("identities", translate("dashboard.messaging"), <MessageCircle size={18} />)}
            <Show when={props.developerMode}>{navItem("config", translate("identities.tab_advanced"), <SlidersHorizontal size={18} />)}</Show>
          </div>
          <div class="mt-2 border-t border-dls-border pt-2">
            <StatusBar
              clientConnected={props.clientConnected}
              openworkServerStatus={props.openworkServerStatus}
              developerMode={props.developerMode}
              onOpenSettings={() => openSettings("general")}
              onOpenMessaging={openConfig}
              onOpenProviders={() => props.openProviderAuthModal()}
              onOpenMcp={() => props.setTab("mcp")}
              providerConnectedIds={props.providerConnectedIds}
              mcpStatuses={props.mcpStatuses}
              presentation="plain"
              showTips={false}
              showSettingsButton={true}
              compact={true}
            />
          </div>
        </div>
      </aside>
      </div>
    </div>
  );
}
