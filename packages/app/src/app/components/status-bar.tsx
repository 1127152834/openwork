import { Show, createEffect, createMemo, createSignal, onCleanup, onMount } from "solid-js";
import { Cpu, Server, Settings } from "lucide-solid";

import type { OpenworkServerStatus } from "../lib/openwork-server";
import type { OpenCodeRouterStatus } from "../lib/tauri";
import type { McpStatusMap } from "../types";
import { getOpenCodeRouterStatus } from "../lib/tauri";
import { currentLocale, t } from "../../i18n";

import Button from "./button";

type StatusBarProps = {
  clientConnected: boolean;
  openworkServerStatus: OpenworkServerStatus;
  developerMode: boolean;
  onOpenSettings: () => void;
  onOpenMessaging: () => void;
  onOpenProviders: () => Promise<void> | void;
  onOpenMcp: () => void;
  providerConnectedIds: string[];
  mcpStatuses: McpStatusMap;
  presentation?: "default" | "plain";
  showSettingsButton?: boolean;
  showTips?: boolean;
  compact?: boolean;
};

export default function StatusBar(props: StatusBarProps) {
  const translate = (key: string) => t(key, currentLocale());

  const [opencodeRouterStatus, setOpenCodeRouterStatus] = createSignal<OpenCodeRouterStatus | null>(null);
  const [documentVisible, setDocumentVisible] = createSignal(true);

  const opencodeStatusMeta = createMemo(() => ({
    dot: props.clientConnected ? "bg-green-9" : "bg-gray-6",
    text: props.clientConnected ? "text-green-11" : "text-gray-10",
    label: props.clientConnected ? translate("dashboard.connected") : translate("dashboard.not_connected"),
  }));

  const openworkStatusMeta = createMemo(() => {
    switch (props.openworkServerStatus) {
      case "connected":
        return { dot: "bg-green-9", text: "text-green-11", label: translate("status_bar.ready") };
      case "limited":
        return { dot: "bg-amber-9", text: "text-amber-11", label: translate("status_bar.limited_access") };
      default:
        return { dot: "bg-gray-6", text: "text-gray-10", label: translate("status_bar.unavailable") };
    }
  });

  const messagingMeta = createMemo(() => {
    const status = opencodeRouterStatus();
    if (!status) {
      return { dot: "bg-gray-6", text: "text-gray-10", label: translate("status_bar.messaging_bridge_unavailable") };
    }
    const telegramConfigured = (status.telegram.items?.length ?? 0) > 0;
    const slackConfigured = (status.slack.items?.length ?? 0) > 0;
    const configuredCount = [telegramConfigured, slackConfigured].filter(Boolean).length;
    if (status.running && configuredCount > 0) {
      return { dot: "bg-green-9", text: "text-green-11", label: translate("status_bar.messaging_bridge_ready") };
    }
    if (configuredCount > 0 || status.running) {
      return { dot: "bg-amber-9", text: "text-amber-11", label: translate("status_bar.messaging_bridge_setup") };
    }
    return { dot: "bg-gray-6", text: "text-gray-10", label: translate("status_bar.messaging_bridge_offline") };
  });

  type ProTip = {
    id: string;
    label: string;
    enabled: () => boolean;
    action: () => void | Promise<void>;
  };

  const providerConnectedCount = createMemo(() => props.providerConnectedIds?.length ?? 0);
  const notionStatus = createMemo(() => props.mcpStatuses?.notion?.status ?? "disconnected");
  const plainPresentation = createMemo(() => props.presentation === "plain");
  const showSettingsButton = createMemo(() => props.showSettingsButton !== false);
  const showTips = createMemo(() => props.showTips !== false);
  const compact = createMemo(() => props.compact === true);

  const runAction = (action?: () => void | Promise<void>) => {
    if (!action) return;
    const result = action();
    if (result && typeof (result as Promise<void>).catch === "function") {
      (result as Promise<void>).catch(() => undefined);
    }
  };

  const proTips = createMemo<ProTip[]>(() => [
    {
      id: "slack",
      label: translate("status_bar.connect_slack"),
      enabled: () => {
        const status = opencodeRouterStatus();
        return Boolean(status && (status.slack.items?.length ?? 0) === 0);
      },
      action: () => runAction(props.onOpenMessaging),
    },
    {
      id: "telegram",
      label: translate("status_bar.connect_telegram"),
      enabled: () => {
        const status = opencodeRouterStatus();
        return Boolean(status && (status.telegram.items?.length ?? 0) === 0);
      },
      action: () => runAction(props.onOpenMessaging),
    },
    {
      id: "notion",
      label: translate("status_bar.connect_notion_mcp"),
      enabled: () => notionStatus() !== "connected",
      action: () => runAction(props.onOpenMcp),
    },
    {
      id: "providers",
      label: translate("status_bar.use_own_models"),
      enabled: () => props.clientConnected && providerConnectedCount() === 0,
      action: () => runAction(props.onOpenProviders),
    },
  ]);

  const availableTips = createMemo<ProTip[]>(() => proTips().filter((tip: ProTip) => tip.enabled()));
  const [activeTip, setActiveTip] = createSignal<ProTip | null>(null);
  const [tipVisible, setTipVisible] = createSignal(false);
  const [tipCursor, setTipCursor] = createSignal(0);
  let tipTimer: number | undefined;
  let tipHideTimer: number | undefined;

  const pickNextTip = () => {
    const tips = availableTips();
    if (!tips.length) return null;
    const index = tipCursor() % tips.length;
    const next = tips[index];
    setTipCursor(index + 1);
    setActiveTip(next);
    return next;
  };

  const scheduleTips = (delayMs: number) => {
    if (tipTimer) window.clearTimeout(tipTimer);
    tipTimer = window.setTimeout(() => {
      if (!availableTips().length) {
        setTipVisible(false);
        scheduleTips(20_000);
        return;
      }
      if (Math.random() < 0.55) {
        pickNextTip();
        setTipVisible(true);
        if (tipHideTimer) window.clearTimeout(tipHideTimer);
        tipHideTimer = window.setTimeout(() => setTipVisible(false), 9_000);
      } else {
        setTipVisible(false);
      }
      scheduleTips(18_000 + Math.round(Math.random() * 10_000));
    }, delayMs);
  };

  createEffect(() => {
    const tips = availableTips();
    const current = activeTip();
    if (current && tips.some((tip: ProTip) => tip.id === current.id)) return;
    if (!tips.length) {
      setActiveTip(null);
      setTipVisible(false);
      return;
    }
    setActiveTip(tips[0]);
    setTipCursor(1);
  });

  const refreshOpenCodeRouter = async () => {
    const next = await getOpenCodeRouterStatus();
    setOpenCodeRouterStatus(next);
  };

  createEffect(() => {
    if (typeof document === "undefined") return;
    const update = () => setDocumentVisible(document.visibilityState !== "hidden");
    update();
    document.addEventListener("visibilitychange", update);
    onCleanup(() => document.removeEventListener("visibilitychange", update));
  });

  createEffect(() => {
    if (!documentVisible()) return;
    refreshOpenCodeRouter();
    const interval = window.setInterval(refreshOpenCodeRouter, 15_000);
    onCleanup(() => window.clearInterval(interval));
  });

  onMount(() => {
    if (!showTips()) return;
    scheduleTips(6_000);
    onCleanup(() => {
      if (tipTimer) window.clearTimeout(tipTimer);
      if (tipHideTimer) window.clearTimeout(tipHideTimer);
    });
  });

  return (
    <div class={plainPresentation() ? "bg-transparent" : "border-t border-gray-6 bg-gray-1/90 backdrop-blur-md"}>
      <div
        class={`${plainPresentation() ? "px-2 py-1.5" : "px-4 py-2"} ${
          compact() ? "flex items-center gap-2 whitespace-nowrap text-xs" : "flex flex-wrap items-center gap-3 text-xs"
        }`}
      >
        <Show when={compact()}>
          <div
            class="inline-flex items-center gap-1.5 rounded-md px-1"
            title={`${translate("status_bar.opencode_engine")}: ${opencodeStatusMeta().label}`}
          >
            <span class={`w-2 h-2 rounded-full ${opencodeStatusMeta().dot}`} />
            <Cpu class={`w-4 h-4 ${opencodeStatusMeta().text}`} />
          </div>
          <div class="h-4 w-px bg-gray-6/70" />
          <div
            class="inline-flex items-center gap-1.5 rounded-md px-1"
            title={`${translate("status_bar.openwork_server")}: ${openworkStatusMeta().label}`}
          >
            <span class={`w-2 h-2 rounded-full ${openworkStatusMeta().dot}`} />
            <Server class={`w-4 h-4 ${openworkStatusMeta().text}`} />
          </div>
          <Show when={showSettingsButton()}>
            <button
              type="button"
              class="ml-auto inline-flex h-7 w-7 items-center justify-center rounded-md border border-dls-border/90 bg-dls-hover/65 text-dls-secondary transition-colors hover:bg-dls-active hover:text-dls-text"
              onClick={props.onOpenSettings}
              title={translate("dashboard.settings")}
              aria-label={translate("dashboard.settings")}
            >
              <Settings class="h-3.5 w-3.5" />
            </button>
          </Show>
        </Show>
        <Show when={!compact()}>
        <div
          class="flex items-center gap-2"
          title={`${translate("status_bar.opencode_engine")}: ${opencodeStatusMeta().label}`}
        >
          <span class={`w-2 h-2 rounded-full ${opencodeStatusMeta().dot}`} />
          <Cpu class="w-4 h-4 text-gray-11" />
          <Show when={props.developerMode || !props.clientConnected}>
            <span class="text-gray-11 font-medium">{translate("status_bar.opencode")}</span>
            <span class={opencodeStatusMeta().text}>{opencodeStatusMeta().label}</span>
          </Show>
        </div>
        <div class="w-px h-4 bg-gray-6/70" />
        <div
          class="flex items-center gap-2"
          title={`${translate("status_bar.openwork_server")}: ${openworkStatusMeta().label}`}
        >
          <span class={`w-2 h-2 rounded-full ${openworkStatusMeta().dot}`} />
          <Server class="w-4 h-4 text-gray-11" />
          <Show when={props.developerMode || props.openworkServerStatus !== "connected"}>
            <span class="text-gray-11 font-medium">{translate("status_bar.openwork")}</span>
            <span class={openworkStatusMeta().text}>{openworkStatusMeta().label}</span>
          </Show>
        </div>
        <Show when={showTips() || showSettingsButton()}>
          <div class="ml-auto flex items-center gap-2">
            <Show when={showTips() && tipVisible() && activeTip()}>
              <button
                type="button"
                class="flex h-7 items-center gap-2 rounded-full border border-gray-6/70 bg-gray-2/40 px-3 text-xs text-gray-10 transition-colors hover:bg-gray-2/60"
                onClick={() => runAction(activeTip()?.action)}
                title={activeTip()?.label}
                aria-label={activeTip()?.label}
              >
                <span class="uppercase tracking-[0.2em] text-[10px] text-gray-8">{translate("status_bar.tip")}</span>
                <span class="text-gray-11 font-medium">{activeTip()?.label}</span>
              </button>
            </Show>
            <Show when={showSettingsButton()}>
              <Button
                variant="ghost"
                class="h-7 px-2.5 py-0 text-xs"
                onClick={props.onOpenSettings}
                title={translate("dashboard.settings")}
              >
                <Settings class="w-4 h-4" />
                <Show when={props.developerMode}>
                  <span class="text-gray-11 font-medium">{translate("dashboard.settings")}</span>
                </Show>
              </Button>
            </Show>
          </div>
        </Show>
        </Show>
      </div>
    </div>
  );
}
