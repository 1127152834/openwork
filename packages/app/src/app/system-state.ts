import { createEffect, createMemo, createSignal, type Accessor } from "solid-js";

import type { Session } from "@opencode-ai/sdk/v2/client";
import type { ProviderListItem } from "./types";

import { check } from "@tauri-apps/plugin-updater";
import { relaunch } from "@tauri-apps/plugin-process";

import type {
  Client,
  PluginScope,
  ReloadReason,
  ReloadTrigger,
  ResetOpenworkMode,
  UpdateHandle,
} from "./types";
import { addOpencodeCacheHint, isTauriRuntime, safeStringify } from "./utils";
import { mapConfigProvidersToList } from "./utils/providers";
import { createUpdaterState } from "./context/updater";
import { currentLocale, t } from "../i18n";
import {
  resetOpenworkState,
  resetOpencodeCache,
  sandboxCleanupOpenworkContainers,
} from "./lib/tauri";
import { unwrap, waitForHealthy } from "./lib/opencode";

export type NotionState = {
  status: Accessor<"disconnected" | "connecting" | "connected" | "error">;
  setStatus: (value: "disconnected" | "connecting" | "connected" | "error") => void;
  statusDetail: Accessor<string | null>;
  setStatusDetail: (value: string | null) => void;
  skillInstalled: Accessor<boolean>;
  setTryPromptVisible: (value: boolean) => void;
};

export function createSystemState(options: {
  client: Accessor<Client | null>;
  sessions: Accessor<Session[]>;
  sessionStatusById: Accessor<Record<string, string>>;
  refreshPlugins: (scopeOverride?: PluginScope) => Promise<void>;
  refreshSkills: (options?: { force?: boolean }) => Promise<void>;
  refreshMcpServers?: () => Promise<void>;
  reloadWorkspaceEngine?: () => Promise<boolean>;
  canReloadWorkspaceEngine?: () => boolean;
  setProviders: (value: ProviderListItem[]) => void;
  setProviderDefaults: (value: Record<string, string>) => void;
  setProviderConnectedIds: (value: string[]) => void;
  setError: (value: string | null) => void;
  notion?: NotionState;
}) {
  const translate = (key: string) => t(key, currentLocale());
  const translateWithVars = (key: string, vars: Record<string, string | number>) => {
    let text = translate(key);
    for (const [name, value] of Object.entries(vars)) {
      text = text.replaceAll(`{${name}}`, String(value));
    }
    return text;
  };

  const [reloadRequired, setReloadRequired] = createSignal(false);
  const [reloadReasons, setReloadReasons] = createSignal<ReloadReason[]>([]);
  const [reloadLastTriggeredAt, setReloadLastTriggeredAt] = createSignal<number | null>(null);
  const [reloadLastFinishedAt, setReloadLastFinishedAt] = createSignal<number | null>(null);
  const [reloadTrigger, setReloadTrigger] = createSignal<ReloadTrigger | null>(null);
  const [reloadBusy, setReloadBusy] = createSignal(false);
  const [reloadError, setReloadError] = createSignal<string | null>(null);

  const [cacheRepairBusy, setCacheRepairBusy] = createSignal(false);
  const [cacheRepairResult, setCacheRepairResult] = createSignal<string | null>(null);
  const [dockerCleanupBusy, setDockerCleanupBusy] = createSignal(false);
  const [dockerCleanupResult, setDockerCleanupResult] = createSignal<string | null>(null);

  const updater = createUpdaterState();
  const {
    updateAutoCheck,
    setUpdateAutoCheck,
    updateAutoDownload,
    setUpdateAutoDownload,
    updateStatus,
    setUpdateStatus,
    pendingUpdate,
    setPendingUpdate,
    updateEnv,
    setUpdateEnv,
  } = updater;

  const [resetModalOpen, setResetModalOpen] = createSignal(false);
  const [resetModalMode, setResetModalMode] = createSignal<ResetOpenworkMode>("onboarding");
  const [resetModalText, setResetModalText] = createSignal("");
  const [resetModalBusy, setResetModalBusy] = createSignal(false);

  const resetModalTextValue = resetModalText;

  const anyActiveRuns = createMemo(() => {
    const statuses = options.sessionStatusById();
    return options.sessions().some((s) => statuses[s.id] === "running" || statuses[s.id] === "retry");
  });

  function clearOpenworkLocalStorage() {
    if (typeof window === "undefined") return;

    try {
      const keys = Object.keys(window.localStorage);
      for (const key of keys) {
        if (key.startsWith("openwork.")) {
          window.localStorage.removeItem(key);
        }
      }
      // Legacy compatibility key
      window.localStorage.removeItem("openwork_mode_pref");
    } catch {
      // ignore
    }
  }

  function openResetModal(mode: ResetOpenworkMode) {
    if (anyActiveRuns()) {
      options.setError(translate("settings.reset_stop_active_runs"));
      return;
    }

    options.setError(null);
    setResetModalMode(mode);
    setResetModalText("");
    setResetModalOpen(true);
  }

  async function confirmReset() {
    if (resetModalBusy()) return;

    if (anyActiveRuns()) {
      options.setError(translate("settings.reset_stop_active_runs"));
      return;
    }

    if (resetModalTextValue().trim().toUpperCase() !== "RESET") return;

    setResetModalBusy(true);
    options.setError(null);

    try {
      if (isTauriRuntime()) {
        await resetOpenworkState(resetModalMode());
      }

      clearOpenworkLocalStorage();

      if (isTauriRuntime()) {
        await relaunch();
      } else {
        window.location.reload();
      }
    } catch (e) {
      const message = e instanceof Error ? e.message : safeStringify(e);
      options.setError(addOpencodeCacheHint(message));
      setResetModalBusy(false);
    }
  }

  function markReloadRequired(reason: ReloadReason, trigger?: ReloadTrigger) {
    setReloadRequired(true);
    setReloadLastTriggeredAt(Date.now());
    setReloadReasons((current) => (current.includes(reason) ? current : [...current, reason]));
    if (trigger) {
      setReloadTrigger(trigger);
    } else {
      setReloadTrigger({
        type:
          reason === "plugins"
            ? "plugin"
            : reason === "skills"
              ? "skill"
              : reason === "agents"
                ? "agent"
                : reason === "commands"
                  ? "command"
                  : reason,
      });
    }
  }

  function clearReloadRequired() {
    setReloadRequired(false);
    setReloadReasons([]);
    setReloadError(null);
    setReloadTrigger(null);
  }

  const reloadCopy = createMemo(() => {
    const reasons = reloadReasons();
    if (!reasons.length) {
      return {
        title: translate("settings.reload_required"),
        body: translate("system_state.reload_body_general"),
      };
    }

    if (reasons.length === 1 && reasons[0] === "plugins") {
      return {
        title: translate("settings.reload_required"),
        body: translate("system_state.reload_body_plugins"),
      };
    }

    if (reasons.length === 1 && reasons[0] === "skills") {
      return {
        title: translate("settings.reload_required"),
        body: translate("system_state.reload_body_skills"),
      };
    }

    if (reasons.length === 1 && reasons[0] === "agents") {
      return {
        title: translate("settings.reload_required"),
        body: translate("system_state.reload_body_agents"),
      };
    }

    if (reasons.length === 1 && reasons[0] === "commands") {
      return {
        title: translate("settings.reload_required"),
        body: translate("system_state.reload_body_commands"),
      };
    }

    if (reasons.length === 1 && reasons[0] === "config") {
      return {
        title: translate("settings.reload_required"),
        body: translate("system_state.reload_body_config"),
      };
    }

    if (reasons.length === 1 && reasons[0] === "mcp") {
      return {
        title: translate("settings.reload_required"),
        body: translate("system_state.reload_body_mcp"),
      };
    }

    return {
      title: translate("settings.reload_required"),
      body: translate("system_state.reload_body_multiple"),
    };
  });

  const canReloadEngine = createMemo(() => {
    if (!reloadRequired()) return false;
    if (reloadBusy()) return false;
    const override = options.canReloadWorkspaceEngine?.();
    if (override === true) return true;
    if (override === false) return false;
    if (!options.client()) return false;
    return true;
  });

  // Keep this mounted so the reload banner UX remains in the app.
  createEffect(() => {
    reloadRequired();
  });

  async function reloadEngineInstance() {
    const initialClient = options.client();
    if (!initialClient) return;

    const override = options.canReloadWorkspaceEngine?.();
    if (override === false) {
      setReloadError(translate("system_state.reload_unavailable_for_worker"));
      return;
    }

    setReloadBusy(true);
    setReloadError(null);

    try {
      if (options.reloadWorkspaceEngine) {
        const ok = await options.reloadWorkspaceEngine();
        if (ok === false) {
          setReloadError(translate("system_state.reload_failed"));
          return;
        }
      } else {
        unwrap(await initialClient.instance.dispose());
      }

      const nextClient = options.client();
      if (!nextClient) {
        throw new Error(translate("system_state.client_unavailable_after_reload"));
      }

      await waitForHealthy(nextClient, { timeoutMs: 12_000 });

      try {
        const providerList = unwrap(await nextClient.provider.list());
        options.setProviders(providerList.all);
        options.setProviderDefaults(providerList.default);
        options.setProviderConnectedIds(providerList.connected);
      } catch {
        try {
          const cfg = unwrap(await nextClient.config.providers());
          options.setProviders(mapConfigProvidersToList(cfg.providers));
          options.setProviderDefaults(cfg.default);
          options.setProviderConnectedIds([]);
        } catch {
          options.setProviders([]);
          options.setProviderDefaults({});
          options.setProviderConnectedIds([]);
        }
      }

      await options.refreshPlugins("project").catch(() => undefined);
      await options.refreshSkills({ force: true }).catch(() => undefined);
      await options.refreshMcpServers?.().catch(() => undefined);

      if (options.notion) {
        let nextStatus = options.notion.status();
        if (nextStatus === "connecting") {
          nextStatus = "connected";
          options.notion.setStatus(nextStatus);
          options.notion.setStatusDetail(translate("system_state.worker_connected"));
        }

        if (nextStatus === "connected") {
          const detail = options.notion.statusDetail();
          if (!detail || detail.toLowerCase().includes("reload")) {
            options.notion.setStatusDetail(translate("system_state.worker_connected"));
          }
        }

        try {
          window.localStorage.setItem("openwork.notionStatus", nextStatus);
          if (nextStatus === "connected") {
            const detail = options.notion.statusDetail();
            if (detail) {
              window.localStorage.setItem("openwork.notionStatusDetail", detail);
            } else {
              window.localStorage.removeItem("openwork.notionStatusDetail");
            }
          }
        } catch {
          // ignore
        }
      }

      clearReloadRequired();
      if (options.notion && options.notion.status() === "connected" && options.notion.skillInstalled()) {
        options.notion.setTryPromptVisible(true);
      }
    } catch (e) {
      setReloadError(e instanceof Error ? e.message : safeStringify(e));
    } finally {
      setReloadBusy(false);
      setReloadLastFinishedAt(Date.now());
    }
  }

  async function reloadWorkspaceEngine() {
    await reloadEngineInstance();
  }

  async function repairOpencodeCache() {
    if (!isTauriRuntime()) {
      setCacheRepairResult(translate("settings.cache_repair_requires_desktop"));
      return;
    }

    if (cacheRepairBusy()) return;

    setCacheRepairBusy(true);
    setCacheRepairResult(null);
    options.setError(null);

    try {
      const result = await resetOpencodeCache();
      if (result.errors.length) {
        setCacheRepairResult(result.errors[0]);
        return;
      }

      if (result.removed.length) {
        setCacheRepairResult(translate("system_state.cache_repaired"));
      } else {
        setCacheRepairResult(translate("system_state.cache_not_found"));
      }
    } catch (e) {
      setCacheRepairResult(e instanceof Error ? e.message : safeStringify(e));
    } finally {
      setCacheRepairBusy(false);
    }
  }

  async function cleanupOpenworkDockerContainers() {
    if (!isTauriRuntime()) {
      setDockerCleanupResult(translate("settings.docker_cleanup_requires_desktop"));
      return;
    }

    if (dockerCleanupBusy()) return;

    setDockerCleanupBusy(true);
    setDockerCleanupResult(null);
    options.setError(null);

    try {
      const result = await sandboxCleanupOpenworkContainers();
      if (!result.candidates.length) {
        setDockerCleanupResult(translate("system_state.no_openwork_docker_containers"));
        return;
      }

      const removedCount = result.removed.length;
      if (result.errors.length) {
        const first = result.errors[0];
        setDockerCleanupResult(
          translateWithVars("system_state.docker_cleanup_partial", {
            removed: removedCount,
            total: result.candidates.length,
            error: first,
          }),
        );
        return;
      }

      setDockerCleanupResult(translateWithVars("system_state.docker_cleanup_success", { removed: removedCount }));
    } catch (e) {
      setDockerCleanupResult(e instanceof Error ? e.message : safeStringify(e));
    } finally {
      setDockerCleanupBusy(false);
    }
  }

  async function checkForUpdates(optionsCheck?: { quiet?: boolean }) {
    if (!isTauriRuntime()) return;

    const env = updateEnv();
    if (env && !env.supported) {
      if (!optionsCheck?.quiet) {
        setUpdateStatus({
          state: "error",
          lastCheckedAt:
            updateStatus().state === "idle"
              ? (updateStatus() as { state: "idle"; lastCheckedAt: number | null }).lastCheckedAt
              : null,
          message: env.reason ?? translate("settings.update_not_supported"),
        });
      }
      return;
    }

    const prev = updateStatus();
    setUpdateStatus({ state: "checking", startedAt: Date.now() });

    try {
      const update = (await check({ timeout: 8_000 })) as unknown as UpdateHandle | null;
      const checkedAt = Date.now();

      if (!update) {
        setPendingUpdate(null);
        setUpdateStatus({ state: "idle", lastCheckedAt: checkedAt });
        return;
      }

      const notes = typeof update.body === "string" ? update.body : undefined;
      setPendingUpdate({ update, version: update.version, notes });
      setUpdateStatus({
        state: "available",
        lastCheckedAt: checkedAt,
        version: update.version,
        date: update.date,
        notes,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : safeStringify(e);

      if (optionsCheck?.quiet) {
        setUpdateStatus(prev);
        return;
      }

      setPendingUpdate(null);
      setUpdateStatus({ state: "error", lastCheckedAt: null, message });
    }
  }

  async function downloadUpdate() {
    const pending = pendingUpdate();
    if (!pending) return;

    const state = updateStatus();
    if (state.state === "downloading" || state.state === "ready") return;

    options.setError(null);
    const lastCheckedAt = state.state === "available" ? state.lastCheckedAt : Date.now();

    setUpdateStatus({
      state: "downloading",
      lastCheckedAt,
      version: pending.version,
      totalBytes: null,
      downloadedBytes: 0,
      notes: pending.notes,
    });

    try {
      let totalBytes: number | null = null;
      let downloadedBytes = 0;
      let lastPublishedBytes = 0;
      let lastPublishedAt = 0;

      const publishProgress = (force = false) => {
        const now = Date.now();
        const elapsed = now - lastPublishedAt;
        const movedBytes = downloadedBytes - lastPublishedBytes;
        if (!force && elapsed < 180 && movedBytes < 256 * 1024) {
          return;
        }
        lastPublishedAt = now;
        lastPublishedBytes = downloadedBytes;
        setUpdateStatus((current) => {
          if (current.state !== "downloading") return current;
          return {
            ...current,
            totalBytes,
            downloadedBytes,
          };
        });
      };

      await pending.update.download((event: any) => {
        if (!event || typeof event !== "object") return;
        const record = event as Record<string, any>;

        if (record.event === "Started") {
          totalBytes =
            record.data && typeof record.data.contentLength === "number" ? record.data.contentLength : null;
          publishProgress(true);
          return;
        }

        if (record.event === "Progress") {
          const chunk = record.data && typeof record.data.chunkLength === "number" ? record.data.chunkLength : 0;
          downloadedBytes += chunk;
          publishProgress(false);
          return;
        }
      });

      publishProgress(true);

      setUpdateStatus({
        state: "ready",
        lastCheckedAt,
        version: pending.version,
        notes: pending.notes,
      });
    } catch (e) {
      const message = e instanceof Error ? e.message : safeStringify(e);
      setUpdateStatus({ state: "error", lastCheckedAt, message });
    }
  }

  async function installUpdateAndRestart() {
    const pending = pendingUpdate();
    if (!pending) return;

    if (anyActiveRuns()) {
      options.setError(translate("settings.stop_runs_to_update"));
      return;
    }

    options.setError(null);
    try {
      await pending.update.install();
      await pending.update.close();
      await relaunch();
    } catch (e) {
      const message = e instanceof Error ? e.message : safeStringify(e);
      setUpdateStatus({ state: "error", lastCheckedAt: null, message });
    }
  }

  return {
    reloadRequired,
    reloadReasons,
    reloadLastTriggeredAt,
    reloadLastFinishedAt,
    setReloadLastFinishedAt,
    reloadTrigger,
    reloadBusy,
    reloadError,
    reloadCopy,
    canReloadEngine,
    markReloadRequired,
    clearReloadRequired,
    reloadEngineInstance,
    reloadWorkspaceEngine,
    cacheRepairBusy,
    cacheRepairResult,
    repairOpencodeCache,
    dockerCleanupBusy,
    dockerCleanupResult,
    cleanupOpenworkDockerContainers,
    updateAutoCheck,
    setUpdateAutoCheck,
    updateAutoDownload,
    setUpdateAutoDownload,
    updateStatus,
    setUpdateStatus,
    pendingUpdate,
    setPendingUpdate,
    updateEnv,
    setUpdateEnv,
    checkForUpdates,
    downloadUpdate,
    installUpdateAndRestart,
    resetModalOpen,
    setResetModalOpen,
    resetModalMode,
    setResetModalMode,
    resetModalText: resetModalTextValue,
    setResetModalText,
    resetModalBusy,
    openResetModal,
    confirmReset,
    anyActiveRuns,
  };
}
