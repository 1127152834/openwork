"use client";

import { FormEvent, useEffect, useState } from "react";

type Step = 1 | 2;
type AuthMode = "sign-in" | "sign-up";
type ShellView = "workers" | "billing";
type WorkerStatusBucket = "ready" | "starting" | "attention" | "other";

type AuthUser = {
  id: string;
  email: string;
  name: string | null;
};

type WorkerLaunch = {
  workerId: string;
  workerName: string;
  status: string;
  provider: string | null;
  instanceUrl: string | null;
  openworkUrl: string | null;
  workspaceId: string | null;
  clientToken: string | null;
  hostToken: string | null;
};

type WorkerSummary = {
  workerId: string;
  workerName: string;
  status: string;
  instanceUrl: string | null;
  provider: string | null;
  isMine: boolean;
};

type WorkerTokens = {
  clientToken: string | null;
  hostToken: string | null;
  openworkUrl: string | null;
  workspaceId: string | null;
};

type WorkerListItem = {
  workerId: string;
  workerName: string;
  status: string;
  instanceUrl: string | null;
  provider: string | null;
  isMine: boolean;
  createdAt: string | null;
};

type EventLevel = "info" | "success" | "warning" | "error";

type LaunchEvent = {
  id: string;
  level: EventLevel;
  label: string;
  detail: string;
  at: string;
};

function getAuthInfoForMode(mode: AuthMode): string {
  return mode === "sign-up"
    ? uiText("Create an account to launch and manage cloud workers.", "创建账号以启动和管理云端 Worker。")
    : uiText("Sign in to launch and manage cloud workers.", "登录以启动和管理云端 Worker。");
}

const CLOUD_CONTROL_COPY = {
  en: {
    no_active_session_sign_in: "No active session found. Sign in first.",
    session_response_missing_user: "Session response did not include a user.",
    github_signin_no_redirect: "GitHub sign-in did not return a redirect URL.",
    sign_in_before_launch: "Sign in before launching a worker.",
    launch_missing_worker_details: "Launch response was missing worker details.",
    sign_in_before_status: "Sign in before checking worker status.",
    launch_worker_first_status_panel: "No worker selected yet. Launch one first, then use this panel.",
    status_missing_worker_details: "Status response was missing worker details.",
    sign_in_before_fetch_token: "Sign in before fetching a worker access token.",
    launch_worker_first_fetch_token: "No worker selected yet. Launch one first, then fetch a token.",
    token_response_missing_values: "Token response returned no token values.",
    sign_in_before_delete: "Sign in before deleting a worker.",
    search_placeholder: "Search...",
    url_appears_ready: "URL appears once ready",
    use_worker_actions_refresh: "Use Worker actions to refresh",
    host_url: "Host URL",
    worker_id: "Worker ID"
  },
  zh: {
    no_active_session_sign_in: "未找到有效会话，请先登录。",
    session_response_missing_user: "会话响应中缺少用户信息。",
    github_signin_no_redirect: "GitHub 登录未返回重定向 URL。",
    sign_in_before_launch: "请先登录再启动工作区。",
    launch_missing_worker_details: "启动响应缺少工作区详情。",
    sign_in_before_status: "请先登录再检查工作区状态。",
    launch_worker_first_status_panel: "尚未选择工作区。请先启动一个工作区，再使用此面板。",
    status_missing_worker_details: "状态响应缺少工作区详情。",
    sign_in_before_fetch_token: "请先登录再获取工作区访问令牌。",
    launch_worker_first_fetch_token: "尚未选择工作区。请先启动一个工作区，再获取令牌。",
    token_response_missing_values: "令牌响应未返回任何令牌值。",
    sign_in_before_delete: "请先登录再删除工作区。",
    search_placeholder: "搜索...",
    url_appears_ready: "就绪后会显示 URL",
    use_worker_actions_refresh: "使用 Worker 操作进行刷新",
    host_url: "主机 URL",
    worker_id: "工作区 ID"
  }
} as const;

type CloudControlCopyKey = keyof (typeof CLOUD_CONTROL_COPY)["en"];

function getCloudControlLocale(): "en" | "zh" {
  if (typeof document !== "undefined") {
    const langAttr = document.documentElement.lang?.trim().toLowerCase();
    if (langAttr.startsWith("zh")) return "zh";
  }
  if (typeof navigator !== "undefined") {
    const navLang = navigator.language?.trim().toLowerCase();
    if (navLang.startsWith("zh")) return "zh";
  }
  return "en";
}

function cloudText(key: CloudControlCopyKey): string {
  const locale = getCloudControlLocale();
  return CLOUD_CONTROL_COPY[locale][key] ?? CLOUD_CONTROL_COPY.en[key];
}

function uiText(en: string, zh: string): string {
  return getCloudControlLocale() === "zh" ? zh : en;
}

const LAST_WORKER_STORAGE_KEY = "openwork:web:last-worker";
const WORKER_STATUS_POLL_MS = 5000;
const DEFAULT_AUTH_NAME = "OpenWork User";
const OPENWORK_APP_CONNECT_BASE_URL = (process.env.NEXT_PUBLIC_OPENWORK_APP_CONNECT_URL ?? "").trim();
const OPENWORK_AUTH_CALLBACK_BASE_URL = (process.env.NEXT_PUBLIC_OPENWORK_AUTH_CALLBACK_URL ?? "https://app.openwork.software").trim();

function getGithubCallbackUrl(): string {
  try {
    return new URL("/", OPENWORK_AUTH_CALLBACK_BASE_URL || "https://app.openwork.software").toString();
  } catch {
    return "https://app.openwork.software/";
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function shortValue(value: string): string {
  if (value.length <= 18) {
    return value;
  }
  return `${value.slice(0, 8)}...${value.slice(-6)}`;
}

function getErrorMessage(payload: unknown, fallback: string): string {
  if (typeof payload === "string" && payload.trim().length > 0) {
    const trimmed = payload.trim();
    const lower = trimmed.toLowerCase();
    if (lower.startsWith("<!doctype") || lower.startsWith("<html") || lower.includes("<body")) {
      return `${fallback} ${uiText("Upstream returned an HTML error page.", "上游返回了 HTML 错误页。")}`;
    }
    if (trimmed.length > 240) {
      return `${fallback} ${uiText("Upstream returned a non-JSON error payload.", "上游返回了非 JSON 错误载荷。")}`;
    }
    return trimmed;
  }

  if (!isRecord(payload)) {
    return fallback;
  }

  const message = payload.message;
  if (typeof message === "string" && message.trim().length > 0) {
    return message;
  }

  const error = payload.error;
  if (typeof error === "string" && error.trim().length > 0) {
    return error;
  }

  return fallback;
}

function getUser(payload: unknown): AuthUser | null {
  if (!isRecord(payload) || !isRecord(payload.user)) {
    return null;
  }

  const user = payload.user;
  if (typeof user.id !== "string" || typeof user.email !== "string") {
    return null;
  }

  return {
    id: user.id,
    email: user.email,
    name: typeof user.name === "string" ? user.name : null
  };
}

function getToken(payload: unknown): string | null {
  if (!isRecord(payload)) {
    return null;
  }
  return typeof payload.token === "string" ? payload.token : null;
}

function getCheckoutUrl(payload: unknown): string | null {
  if (!isRecord(payload) || !isRecord(payload.polar)) {
    return null;
  }
  return typeof payload.polar.checkoutUrl === "string" ? payload.polar.checkoutUrl : null;
}

function getWorker(payload: unknown): WorkerLaunch | null {
  if (!isRecord(payload) || !isRecord(payload.worker)) {
    return null;
  }

  const worker = payload.worker;
  if (typeof worker.id !== "string" || typeof worker.name !== "string") {
    return null;
  }

  const instance = isRecord(payload.instance) ? payload.instance : null;
  const tokens = isRecord(payload.tokens) ? payload.tokens : null;

  return {
    workerId: worker.id,
    workerName: worker.name,
    status: typeof worker.status === "string" ? worker.status : "unknown",
    provider: instance && typeof instance.provider === "string" ? instance.provider : null,
    instanceUrl: instance && typeof instance.url === "string" ? instance.url : null,
    openworkUrl: instance && typeof instance.url === "string" ? instance.url : null,
    workspaceId: null,
    clientToken: tokens && typeof tokens.client === "string" ? tokens.client : null,
    hostToken: tokens && typeof tokens.host === "string" ? tokens.host : null
  };
}

function getWorkerSummary(payload: unknown): WorkerSummary | null {
  if (!isRecord(payload) || !isRecord(payload.worker)) {
    return null;
  }

  const worker = payload.worker;
  if (typeof worker.id !== "string" || typeof worker.name !== "string") {
    return null;
  }

  const instance = isRecord(payload.instance) ? payload.instance : null;

  return {
    workerId: worker.id,
    workerName: worker.name,
    status: typeof worker.status === "string" ? worker.status : "unknown",
    instanceUrl: instance && typeof instance.url === "string" ? instance.url : null,
    provider: instance && typeof instance.provider === "string" ? instance.provider : null,
    isMine: worker.isMine === true
  };
}

function getWorkerTokens(payload: unknown): WorkerTokens | null {
  if (!isRecord(payload) || !isRecord(payload.tokens)) {
    return null;
  }

  const tokens = payload.tokens;
  const connect = isRecord(payload.connect) ? payload.connect : null;
  const clientToken = typeof tokens.client === "string" ? tokens.client : null;
  const hostToken = typeof tokens.host === "string" ? tokens.host : null;
  const openworkUrl = connect && typeof connect.openworkUrl === "string" ? connect.openworkUrl : null;
  const workspaceId = connect && typeof connect.workspaceId === "string" ? connect.workspaceId : null;

  if (!clientToken && !hostToken) {
    return null;
  }

  return { clientToken, hostToken, openworkUrl, workspaceId };
}

function parseWorkerListItem(value: unknown): WorkerListItem | null {
  if (!isRecord(value)) {
    return null;
  }

  const workerId = value.id;
  const workerName = value.name;
  if (typeof workerId !== "string" || typeof workerName !== "string") {
    return null;
  }

  const instance = isRecord(value.instance) ? value.instance : null;
  const createdAt = typeof value.createdAt === "string" ? value.createdAt : null;

  return {
    workerId,
    workerName,
    status: typeof value.status === "string" ? value.status : "unknown",
    instanceUrl: instance && typeof instance.url === "string" ? instance.url : null,
    provider: instance && typeof instance.provider === "string" ? instance.provider : null,
    isMine: value.isMine === true,
    createdAt
  };
}

function getWorkersList(payload: unknown): WorkerListItem[] {
  if (!isRecord(payload) || !Array.isArray(payload.workers)) {
    return [];
  }

  const rows: WorkerListItem[] = [];
  for (const item of payload.workers) {
    const parsed = parseWorkerListItem(item);
    if (parsed) {
      rows.push(parsed);
    }
  }

  return rows;
}

function getWorkerStatusMeta(status: string): { label: string; bucket: WorkerStatusBucket } {
  const normalized = status.trim().toLowerCase();

  if (normalized === "healthy" || normalized === "ready") {
    return { label: uiText("Ready", "就绪"), bucket: "ready" };
  }

  if (normalized === "provisioning" || normalized === "starting") {
    return { label: uiText("Starting", "启动中"), bucket: "starting" };
  }

  if (normalized === "failed" || normalized === "suspended" || normalized === "stopped") {
    return { label: uiText("Needs attention", "需关注"), bucket: "attention" };
  }

  return { label: uiText("Unknown", "未知"), bucket: "other" };
}

function getWorkerStatusCopy(status: string): string {
  const normalized = status.trim().toLowerCase();
  switch (normalized) {
    case "provisioning":
    case "starting":
      return uiText("Starting... This may take a minute.", "启动中... 可能需要一分钟。");
    case "healthy":
    case "ready":
      return uiText("Ready to connect.", "已可连接。");
    case "failed":
      return uiText("Worker failed to start.", "Worker 启动失败。");
    case "suspended":
    case "stopped":
      return uiText("Worker is suspended.", "Worker 已暂停。");
    default:
      return uiText("Worker status unknown.", "Worker 状态未知。");
  }
}

function getWorkerAddressLabel(item: WorkerListItem): string {
  if (!item.instanceUrl) {
    return shortValue(item.workerId);
  }

  try {
    return new URL(item.instanceUrl).host;
  } catch {
    return shortValue(item.instanceUrl);
  }
}

function isWorkerLaunch(value: unknown): value is WorkerLaunch {
  if (!isRecord(value)) {
    return false;
  }

  return (
    typeof value.workerId === "string" &&
    typeof value.workerName === "string" &&
    typeof value.status === "string" &&
    (typeof value.provider === "string" || value.provider === null) &&
    (typeof value.instanceUrl === "string" || value.instanceUrl === null) &&
    (typeof value.openworkUrl === "string" || value.openworkUrl === null || typeof value.openworkUrl === "undefined") &&
    (typeof value.workspaceId === "string" || value.workspaceId === null || typeof value.workspaceId === "undefined") &&
    (typeof value.clientToken === "string" || value.clientToken === null) &&
    (typeof value.hostToken === "string" || value.hostToken === null)
  );
}

function listItemToWorker(item: WorkerListItem, current: WorkerLaunch | null = null): WorkerLaunch {
  return {
    workerId: item.workerId,
    workerName: item.workerName,
    status: item.status,
    provider: item.provider,
    instanceUrl: item.instanceUrl,
    openworkUrl: item.instanceUrl,
    workspaceId: null,
    clientToken: current?.workerId === item.workerId ? current.clientToken : null,
    hostToken: current?.workerId === item.workerId ? current.hostToken : null
  };
}

function normalizeUrl(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

function parseWorkspaceIdFromUrl(value: string): string | null {
  const normalized = normalizeUrl(value);
  if (!normalized) {
    return null;
  }

  try {
    const url = new URL(normalized);
    const segments = url.pathname.split("/").filter(Boolean);
    const last = segments[segments.length - 1] ?? "";
    const prev = segments[segments.length - 2] ?? "";
    if (prev !== "w" || !last) {
      return null;
    }
    return decodeURIComponent(last);
  } catch {
    const match = normalized.match(/\/w\/([^/?#]+)/);
    if (!match?.[1]) {
      return null;
    }
    try {
      return decodeURIComponent(match[1]);
    } catch {
      return match[1];
    }
  }
}

function buildWorkspaceUrl(instanceUrl: string, workspaceId: string): string {
  return `${normalizeUrl(instanceUrl)}/w/${encodeURIComponent(workspaceId)}`;
}

function buildOpenworkDeepLink(
  openworkUrl: string | null,
  accessToken: string | null,
  workerId: string | null,
  workerName: string | null,
): string | null {
  if (!openworkUrl || !accessToken) {
    return null;
  }

  const params = new URLSearchParams({
    openworkHostUrl: openworkUrl,
    openworkToken: accessToken,
    source: "openwork-web"
  });

  if (workerId) {
    params.set("workerId", workerId);
  }

  if (workerName) {
    params.set("workerName", workerName);
  }

  return `openwork://connect-remote?${params.toString()}`;
}

function buildOpenworkAppConnectUrl(
  appConnectBaseUrl: string,
  openworkUrl: string | null,
  accessToken: string | null,
  workerId: string | null,
  workerName: string | null,
): string | null {
  if (!appConnectBaseUrl || !openworkUrl || !accessToken) {
    return null;
  }

  let connectUrl: URL;
  try {
    connectUrl = new URL(appConnectBaseUrl);
  } catch {
    return null;
  }

  const normalizedPath = connectUrl.pathname.replace(/\/+$/, "");
  if (!normalizedPath || normalizedPath === "/") {
    connectUrl.pathname = "/connect-remote";
  } else {
    const pathSegments = normalizedPath.split("/").filter(Boolean);
    const lastSegment = (pathSegments[pathSegments.length - 1] ?? "").toLowerCase();
    connectUrl.pathname =
      lastSegment === "connect-remote" ? normalizedPath : `${normalizedPath}/connect-remote`;
  }

  connectUrl.searchParams.set("openworkHostUrl", openworkUrl);
  connectUrl.searchParams.set("openworkToken", accessToken);
  connectUrl.searchParams.set("source", "openwork-web");

  if (workerId) {
    connectUrl.searchParams.set("workerId", workerId);
  }

  if (workerName) {
    connectUrl.searchParams.set("workerName", workerName);
  }

  return connectUrl.toString();
}

function parseWorkspaceIdFromWorkspacesPayload(payload: unknown): string | null {
  if (!isRecord(payload) || !Array.isArray(payload.items)) {
    return null;
  }

  const activeId = typeof payload.activeId === "string" ? payload.activeId : null;
  if (activeId && payload.items.some((item) => isRecord(item) && item.id === activeId)) {
    return activeId;
  }

  for (const item of payload.items) {
    if (isRecord(item) && typeof item.id === "string" && item.id.trim()) {
      return item.id;
    }
  }

  return null;
}

async function requestAbsoluteJson(url: string, init: RequestInit = {}, timeoutMs = 12000) {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");

  const shouldAttachTimeout = !init.signal && timeoutMs > 0;
  const timeoutController = shouldAttachTimeout ? new AbortController() : null;
  const timeoutHandle = timeoutController
    ? setTimeout(() => {
        timeoutController.abort();
      }, timeoutMs)
    : null;

  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers,
      credentials: "omit",
      signal: init.signal ?? timeoutController?.signal
    });
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }

  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  return { response, payload };
}

async function resolveOpenworkWorkspaceUrl(instanceUrl: string, accessToken: string): Promise<{ workspaceId: string; openworkUrl: string } | null> {
  const baseUrl = normalizeUrl(instanceUrl);
  const token = accessToken.trim();
  if (!baseUrl || !token) {
    return null;
  }

  const mountedWorkspaceId = parseWorkspaceIdFromUrl(baseUrl);
  if (mountedWorkspaceId) {
    return {
      workspaceId: mountedWorkspaceId,
      openworkUrl: baseUrl
    };
  }

  const { response, payload } = await requestAbsoluteJson(`${baseUrl}/workspaces`, {
    method: "GET",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    return null;
  }

  const workspaceId = parseWorkspaceIdFromWorkspacesPayload(payload);
  if (!workspaceId) {
    return null;
  }

  return {
    workspaceId,
    openworkUrl: buildWorkspaceUrl(baseUrl, workspaceId)
  };
}

async function requestJson(path: string, init: RequestInit = {}, timeoutMs = 30000) {
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");

  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const shouldAttachTimeout = !init.signal && timeoutMs > 0;
  const timeoutController = shouldAttachTimeout ? new AbortController() : null;
  const timeoutHandle = timeoutController
    ? setTimeout(() => {
        timeoutController.abort();
      }, timeoutMs)
    : null;

  let response: Response;
  try {
    response = await fetch(`/api/den${path}`, {
      ...init,
      headers,
      credentials: "include",
      signal: init.signal ?? timeoutController?.signal
    });
  } finally {
    if (timeoutHandle) {
      clearTimeout(timeoutHandle);
    }
  }

  const text = await response.text();
  let payload: unknown = null;

  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = text;
    }
  }

  return { response, payload, text };
}

function CredentialRow({
  label,
  value,
  placeholder,
  canCopy,
  copied,
  onCopy
}: {
  label: string;
  value: string | null;
  placeholder: string;
  canCopy: boolean;
  copied: boolean;
  onCopy: () => void;
}) {
  return (
    <label className="grid gap-2">
      <span className="px-0.5 text-[0.67rem] font-bold uppercase tracking-[0.11em] text-slate-500">{label}</span>
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 p-1.5">
        <input
          readOnly
          value={value ?? placeholder}
          className="min-w-0 flex-1 border-none bg-transparent px-2 py-1.5 font-mono text-xs text-slate-700 outline-none"
          onClick={(event) => event.currentTarget.select()}
        />
        <button
          type="button"
          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 transition hover:border-[#1B29FF] hover:text-[#1B29FF] disabled:cursor-not-allowed disabled:opacity-50"
          disabled={!canCopy}
          onClick={onCopy}
        >
          {copied ? "Copied" : canCopy ? "Copy" : "N/A"}
        </button>
      </div>
    </label>
  );
}

export function CloudControlPanel() {
  const [step, setStep] = useState<Step>(1);
  const [shellView, setShellView] = useState<ShellView>("workers");

  const [authMode, setAuthMode] = useState<AuthMode>("sign-up");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [authInfo, setAuthInfo] = useState(getAuthInfoForMode("sign-up"));
  const [authError, setAuthError] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authToken, setAuthToken] = useState<string | null>(null);

  const [workerName, setWorkerName] = useState("Founder Ops Pilot");
  const [worker, setWorker] = useState<WorkerLaunch | null>(null);
  const [workerLookupId, setWorkerLookupId] = useState("");
  const [workers, setWorkers] = useState<WorkerListItem[]>([]);
  const [workersBusy, setWorkersBusy] = useState(false);
  const [workersError, setWorkersError] = useState<string | null>(null);
  const [launchBusy, setLaunchBusy] = useState(false);
  const [actionBusy, setActionBusy] = useState<"status" | "token" | null>(null);
  const [launchStatus, setLaunchStatus] = useState(uiText("Name your worker and click launch.", "为 Worker 命名后点击启动。"));
  const [launchError, setLaunchError] = useState<string | null>(null);
  const [checkoutUrl, setCheckoutUrl] = useState<string | null>(null);
  const [paymentReturned, setPaymentReturned] = useState(false);

  const [events, setEvents] = useState<LaunchEvent[]>([]);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [tokenFetchedForWorkerId, setTokenFetchedForWorkerId] = useState<string | null>(null);
  const [deleteBusyWorkerId, setDeleteBusyWorkerId] = useState<string | null>(null);
  const [workerQuery, setWorkerQuery] = useState("");
  const [workerStatusFilter, setWorkerStatusFilter] = useState<WorkerStatusBucket | "all">("all");
  const [showLaunchForm, setShowLaunchForm] = useState(false);
  const [openAccordion, setOpenAccordion] = useState<"connect" | "actions" | "advanced" | null>(null);
  const [showAdvancedOptions, setShowAdvancedOptions] = useState(false);

  const selectedWorker = workers.find((item) => item.workerId === workerLookupId) ?? null;
  const activeWorker: WorkerLaunch | null =
    worker && workerLookupId === worker.workerId
      ? worker
      : selectedWorker
        ? listItemToWorker(selectedWorker, worker)
        : worker;

  const progressWidth = step === 1 ? "45%" : "100%";
  const isShellStep = step === 2;
  const openworkConnectUrl = activeWorker?.openworkUrl ?? activeWorker?.instanceUrl ?? null;
  const hasWorkspaceScopedUrl = Boolean(openworkConnectUrl && /\/w\/[^/?#]+/.test(openworkConnectUrl));
  const openworkDeepLink = buildOpenworkDeepLink(
    openworkConnectUrl,
    activeWorker?.clientToken ?? null,
    activeWorker?.workerId ?? null,
    activeWorker?.workerName ?? null,
  );
  const openworkAppConnectUrl = buildOpenworkAppConnectUrl(
    OPENWORK_APP_CONNECT_BASE_URL,
    openworkConnectUrl,
    activeWorker?.clientToken ?? null,
    activeWorker?.workerId ?? null,
    activeWorker?.workerName ?? null,
  );

  const filteredWorkers = workers.filter((item) => {
    const query = workerQuery.trim().toLowerCase();
    const matchesQuery =
      !query ||
      item.workerName.toLowerCase().includes(query) ||
      item.workerId.toLowerCase().includes(query);

    if (!matchesQuery) {
      return false;
    }

    if (workerStatusFilter === "all") {
      return true;
    }

    return getWorkerStatusMeta(item.status).bucket === workerStatusFilter;
  });

  const selectedWorkerStatus = activeWorker?.status ?? selectedWorker?.status ?? "unknown";
  const selectedStatusMeta = getWorkerStatusMeta(selectedWorkerStatus);

  function appendEvent(level: EventLevel, label: string, detail: string) {
    setEvents((current) => {
      const next: LaunchEvent[] = [
        {
          id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
          level,
          label,
          detail,
          at: new Date().toISOString()
        },
        ...current
      ];

      return next.slice(0, 10);
    });
  }

  async function withResolvedOpenworkCredentials(candidate: WorkerLaunch, options: { quiet?: boolean } = {}) {
    const existingConnectUrl = candidate.openworkUrl?.trim() ?? "";
    const existingWorkspaceId = candidate.workspaceId?.trim() ?? "";
    if (existingConnectUrl && existingWorkspaceId) {
      return {
        ...candidate,
        openworkUrl: existingConnectUrl,
        workspaceId: existingWorkspaceId
      };
    }

    const instanceUrl = candidate.instanceUrl?.trim() ?? "";
    if (!instanceUrl) {
      return {
        ...candidate,
        openworkUrl: null,
        workspaceId: null
      };
    }

    const accessToken = candidate.clientToken?.trim() ?? "";
    if (!accessToken) {
      const mountedWorkspaceId = parseWorkspaceIdFromUrl(instanceUrl);
      return {
        ...candidate,
        openworkUrl: normalizeUrl(instanceUrl),
        workspaceId: mountedWorkspaceId
      };
    }

    try {
      const resolved = await resolveOpenworkWorkspaceUrl(instanceUrl, accessToken);
      if (resolved) {
        return {
          ...candidate,
          openworkUrl: resolved.openworkUrl,
          workspaceId: resolved.workspaceId
        };
      }
    } catch {
      if (!options.quiet) {
        appendEvent("warning", uiText("Credential hint", "凭据提示"), uiText("Could not resolve /w/ws_ URL yet. Using host URL fallback.", "暂时无法解析 /w/ws_ URL，已回退到主机 URL。"));
      }
    }

    return {
      ...candidate,
      openworkUrl: normalizeUrl(instanceUrl),
      workspaceId: parseWorkspaceIdFromUrl(instanceUrl)
    };
  }

  async function refreshWorkers(options: { keepSelection?: boolean } = {}) {
    if (!user) {
      setWorkers([]);
      setWorkersError(null);
      return;
    }

    setWorkersBusy(true);
    setWorkersError(null);

    try {
      const { response, payload } = await requestJson("/v1/workers?limit=20", {
        method: "GET",
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined
      });

      if (!response.ok) {
        const message = getErrorMessage(payload, `${uiText("Failed to load workers", "加载 Worker 失败")} (${response.status}).`);
        setWorkersError(message);
        return;
      }

      const nextWorkers = getWorkersList(payload);
      setWorkers(nextWorkers);

      const currentSelection = options.keepSelection ? workerLookupId : "";
      const nextSelectedId =
        currentSelection && nextWorkers.some((item) => item.workerId === currentSelection)
          ? currentSelection
          : nextWorkers[0]?.workerId ?? "";

      setWorkerLookupId(nextSelectedId);

      if (nextSelectedId && worker && worker.workerId === nextSelectedId) {
        const selected = nextWorkers.find((item) => item.workerId === nextSelectedId) ?? null;
        if (selected) {
          setWorker((current) => listItemToWorker(selected, current));
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : uiText("Unknown network error", "未知网络错误");
      setWorkersError(message);
    } finally {
      setWorkersBusy(false);
    }
  }

  async function copyToClipboard(field: string, value: string | null) {
    if (!value) {
      return;
    }

    await navigator.clipboard.writeText(value);
    setCopiedField(field);
    setTimeout(() => {
      setCopiedField((current) => (current === field ? null : current));
    }, 1800);
  }

  async function refreshSession(quiet = false) {
    const headers = new Headers();
    if (authToken) {
      headers.set("Authorization", `Bearer ${authToken}`);
    }

    const { response, payload } = await requestJson("/v1/me", { method: "GET", headers }, 12000);

    if (!response.ok) {
      setUser(null);
      if (!quiet) {
        setAuthError(cloudText("no_active_session_sign_in"));
      }
      return null;
    }

    const sessionUser = getUser(payload);
    if (!sessionUser) {
      if (!quiet) {
        setAuthError(cloudText("session_response_missing_user"));
      }
      return null;
    }

    setUser(sessionUser);
    setAuthInfo(`${uiText("Signed in as", "当前登录")} ${sessionUser.email}.`);
    return sessionUser;
  }

  useEffect(() => {
    void refreshSession(true);
  }, []);

  useEffect(() => {
    if (!user) {
      setWorkers([]);
      setWorkersError(null);
      return;
    }

    void refreshWorkers();
  }, [user?.id, authToken]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const customerSessionToken = params.get("customer_session_token");
    if (!customerSessionToken) {
      return;
    }

    setPaymentReturned(true);
    setCheckoutUrl(null);
    setLaunchStatus(uiText("Checkout return detected. Click launch to continue worker provisioning.", "检测到支付返回，点击启动即可继续创建 Worker。"));
    appendEvent("success", uiText("Returned from checkout", "已从支付页面返回"), `Session ${shortValue(customerSessionToken)}`);

    params.delete("customer_session_token");
    const nextQuery = params.toString();
    const nextUrl = nextQuery ? `${window.location.pathname}?${nextQuery}` : window.location.pathname;
    window.history.replaceState({}, "", nextUrl);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    const raw = window.localStorage.getItem(LAST_WORKER_STORAGE_KEY);
    if (!raw) {
      return;
    }

    try {
      const parsed = JSON.parse(raw) as unknown;
      if (!isWorkerLaunch(parsed)) {
        return;
      }

      const restored: WorkerLaunch = {
        ...parsed,
        openworkUrl: parsed.openworkUrl ?? parsed.instanceUrl,
        workspaceId: parsed.workspaceId ?? parseWorkspaceIdFromUrl(parsed.instanceUrl ?? ""),
        clientToken: null,
        hostToken: null
      };

      setWorker(restored);
      setWorkerLookupId(restored.workerId);
      setLaunchStatus(`${uiText("Recovered worker", "已恢复 Worker")} ${restored.workerName}. ${getWorkerStatusCopy(restored.status)}`);
      appendEvent("info", uiText("Recovered worker context", "已恢复 Worker 上下文"), `Worker ID ${restored.workerId}`);
    } catch {
      return;
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || !worker) {
      return;
    }

    const serializable: WorkerLaunch = {
      ...worker,
      clientToken: null,
      hostToken: null
    };

    window.localStorage.setItem(LAST_WORKER_STORAGE_KEY, JSON.stringify(serializable));
  }, [worker]);

  useEffect(() => {
    if (user || checkoutUrl || paymentReturned || worker) {
      setStep(2);
      return;
    }

    setStep(1);
  }, [worker, user, checkoutUrl, paymentReturned]);

  useEffect(() => {
    if (step !== 2) {
      return;
    }

    if (workers.length === 0) {
      setShowLaunchForm(true);
    }
  }, [step, workers.length]);

  useEffect(() => {
    if (!user || !worker) {
      return;
    }
    if (worker.clientToken) {
      return;
    }
    if (actionBusy !== null || launchBusy) {
      return;
    }
    if (tokenFetchedForWorkerId === worker.workerId) {
      return;
    }

    setTokenFetchedForWorkerId(worker.workerId);
    void handleGenerateKey();
  }, [actionBusy, launchBusy, tokenFetchedForWorkerId, user, worker]);

  useEffect(() => {
    if (!user || !worker || worker.status !== "provisioning") {
      return;
    }
    if (actionBusy !== null || launchBusy) {
      return;
    }

    let cancelled = false;

    const poll = async () => {
      if (cancelled) {
        return;
      }
      await handleCheckStatus({ workerId: worker.workerId, quiet: true, background: true });
    };

    void poll();
    const interval = window.setInterval(() => {
      void poll();
    }, WORKER_STATUS_POLL_MS);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [actionBusy, authToken, launchBusy, user?.id, worker?.workerId, worker?.status]);

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setAuthBusy(true);
    setAuthError(null);

    try {
      const endpoint = authMode === "sign-up" ? "/api/auth/sign-up/email" : "/api/auth/sign-in/email";
      const trimmedEmail = email.trim();
      const body =
        authMode === "sign-up"
          ? {
              name: DEFAULT_AUTH_NAME,
              email: trimmedEmail,
              password
            }
          : {
              email: trimmedEmail,
              password
            };

      const { response, payload } = await requestJson(endpoint, {
        method: "POST",
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        setAuthError(getErrorMessage(payload, `${uiText("Authentication failed", "认证失败")} ${response.status}.`));
        return;
      }

      const token = getToken(payload);
      if (token) {
        setAuthToken(token);
      }

      const payloadUser = getUser(payload);
      if (payloadUser) {
        setUser(payloadUser);
        setAuthInfo(`${uiText("Signed in as", "当前登录")} ${payloadUser.email}.`);
        appendEvent("success", authMode === "sign-up" ? uiText("Account created", "账号已创建") : uiText("Signed in", "已登录"), payloadUser.email);
      } else {
        const refreshed = await refreshSession(true);
        if (!refreshed) {
          setAuthInfo(uiText("Authentication succeeded, but session details are still syncing.", "认证成功，但会话信息仍在同步。"));
        } else {
          appendEvent("success", authMode === "sign-up" ? uiText("Account created", "账号已创建") : uiText("Signed in", "已登录"), refreshed.email);
        }
      }

      setStep(2);
    } catch (error) {
      const message = error instanceof Error ? error.message : uiText("Unknown network error", "未知网络错误");
      setAuthError(message);
    } finally {
      setAuthBusy(false);
    }
  }

  async function handleGitHubSignIn() {
    if (authBusy || typeof window === "undefined") {
      return;
    }

    setAuthBusy(true);
    setAuthError(null);
    setAuthInfo(uiText("Redirecting to GitHub...", "正在跳转到 GitHub..."));

    try {
      const callbackURL = getGithubCallbackUrl();
      const { response, payload } = await requestJson("/api/auth/sign-in/social", {
        method: "POST",
        body: JSON.stringify({
          provider: "github",
          callbackURL,
          errorCallbackURL: callbackURL
        })
      });

      if (!response.ok) {
        setAuthInfo(getAuthInfoForMode(authMode));
        setAuthError(getErrorMessage(payload, `${uiText("GitHub sign-in failed", "GitHub 登录失败")} ${response.status}.`));
        setAuthBusy(false);
        return;
      }

      const payloadUrl = isRecord(payload) && typeof payload.url === "string" ? payload.url.trim() : "";
      const headerUrl = response.headers.get("location")?.trim() ?? "";
      const redirectUrl = payloadUrl || headerUrl;

      if (!redirectUrl) {
        setAuthInfo(getAuthInfoForMode(authMode));
        setAuthError(cloudText("github_signin_no_redirect"));
        setAuthBusy(false);
        return;
      }

      window.location.assign(redirectUrl);
    } catch (error) {
      const message = error instanceof Error ? error.message : uiText("Unknown network error", "未知网络错误");
      setAuthInfo(getAuthInfoForMode(authMode));
      setAuthError(message);
      setAuthBusy(false);
    }
  }

  async function handleSignOut() {
    if (authBusy) {
      return;
    }

    setAuthBusy(true);
    setAuthError(null);

    try {
      await requestJson("/api/auth/sign-out", {
        method: "POST",
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
        body: JSON.stringify({})
      });
    } catch {
      // Ignore sign-out transport issues and clear local session state anyway.
    } finally {
      setAuthBusy(false);
    }

    setUser(null);
    setAuthToken(null);
    setWorker(null);
    setWorkers([]);
    setWorkerLookupId("");
    setWorkersError(null);
    setLaunchError(null);
    setCheckoutUrl(null);
    setPaymentReturned(false);
    setTokenFetchedForWorkerId(null);
    setDeleteBusyWorkerId(null);
    setActionBusy(null);
    setLaunchBusy(false);
    setStep(1);
    setShellView("workers");
    setWorkerQuery("");
    setWorkerStatusFilter("all");
    setShowLaunchForm(false);
    setAuthMode("sign-up");
    setEmail("");
    setPassword("");
    setAuthInfo(getAuthInfoForMode("sign-up"));
    setLaunchStatus(uiText("Name your worker and click launch.", "为 Worker 命名后点击启动。"));
    setEvents([]);

    if (typeof window !== "undefined") {
      window.localStorage.removeItem(LAST_WORKER_STORAGE_KEY);
    }
  }

  async function handleLaunchWorker() {
    if (!user) {
      setAuthError(cloudText("sign_in_before_launch"));
      return;
    }

    setLaunchBusy(true);
    setLaunchError(null);
    setCheckoutUrl(null);
    setLaunchStatus(uiText("Checking subscription and launch eligibility...", "正在检查订阅与启动资格..."));
    appendEvent("info", uiText("Launch requested", "已请求启动"), workerName.trim() || uiText("Cloud worker", "云端 Worker"));

    try {
      const { response, payload } = await requestJson(
        "/v1/workers",
        {
          method: "POST",
          headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
          body: JSON.stringify({
            name: workerName.trim() || uiText("Cloud Worker", "云端 Worker"),
            destination: "cloud"
          })
        },
        12000
      );

      if (response.status === 402) {
        const url = getCheckoutUrl(payload);
        setCheckoutUrl(url);
        setLaunchStatus(uiText("Payment is required. Complete checkout and return to continue launch.", "需要先完成支付，支付后返回即可继续启动。"));
        setLaunchError(url ? null : uiText("Checkout URL missing from paywall response.", "支付响应中缺少结账 URL。"));
        appendEvent("warning", uiText("Paywall required", "需要支付"), url ? uiText("Checkout URL generated", "已生成结账 URL") : uiText("Checkout URL missing", "缺少结账 URL"));
        return;
      }

      if (!response.ok) {
        const message = getErrorMessage(payload, `${uiText("Launch failed", "启动失败")} ${response.status}.`);
        setLaunchError(message);
        setLaunchStatus(uiText("Launch failed. Fix the error and retry.", "启动失败，请修复问题后重试。"));
        appendEvent("error", uiText("Launch failed", "启动失败"), message);
        return;
      }

      const parsedWorker = getWorker(payload);
      if (!parsedWorker) {
        setLaunchError(cloudText("launch_missing_worker_details"));
        setLaunchStatus(uiText("Launch response format was unexpected.", "启动响应格式异常。"));
        appendEvent("error", uiText("Launch failed", "启动失败"), uiText("Worker payload missing", "缺少 Worker 数据"));
        return;
      }

      const resolvedWorker = await withResolvedOpenworkCredentials(parsedWorker);
      setWorker(resolvedWorker);
      setWorkerLookupId(parsedWorker.workerId);
      setPaymentReturned(false);
      setCheckoutUrl(null);
      setShowLaunchForm(false);

      if (resolvedWorker.status === "provisioning") {
        setLaunchStatus(uiText("Provisioning started. This can take a few minutes, and we will keep checking automatically.", "已开始创建资源，可能需要几分钟，系统会自动持续检查。"));
        appendEvent("info", uiText("Provisioning started", "创建已开始"), `Worker ID ${parsedWorker.workerId}`);
      } else {
        setLaunchStatus(getWorkerStatusCopy(resolvedWorker.status));
        appendEvent("success", uiText("Worker launched", "Worker 已启动"), `Worker ID ${parsedWorker.workerId}`);
      }
    } catch (error) {
      const message =
        error instanceof DOMException && error.name === "AbortError"
          ? uiText("Launch request took longer than expected. Provisioning can continue in the background. Refresh worker status below.", "启动请求超时，资源创建可能仍在后台继续。请在下方刷新状态。")
          : error instanceof Error
            ? error.message
            : uiText("Unknown network error", "未知网络错误");

      setLaunchError(message);
      setLaunchStatus(uiText("Launch request failed.", "启动请求失败。"));
      appendEvent("error", uiText("Launch failed", "启动失败"), message);
    } finally {
      setLaunchBusy(false);
      void refreshWorkers({ keepSelection: true });
    }
  }

  async function handleCheckStatus(options: { workerId?: string; quiet?: boolean; background?: boolean } = {}) {
    const quiet = options.quiet === true;
    const background = options.background === true;

    if (!user) {
      if (!quiet) {
        setLaunchError(cloudText("sign_in_before_status"));
      }
      return;
    }

    const fallbackId = workerLookupId.trim() || worker?.workerId || workers[0]?.workerId || "";
    const id = options.workerId ?? fallbackId;
    if (!id) {
      if (!quiet) {
        setLaunchError(cloudText("launch_worker_first_status_panel"));
      }
      return;
    }

    setWorkerLookupId(id);

    if (!background) {
      setActionBusy("status");
    }
    if (!quiet) {
      setLaunchError(null);
    }

    try {
      const { response, payload } = await requestJson(`/v1/workers/${encodeURIComponent(id)}`, {
        method: "GET",
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined
      });

      if (!response.ok) {
        const message = getErrorMessage(payload, `${uiText("Status check failed", "状态检查失败")} ${response.status}.`);
        if (!quiet) {
          setLaunchError(message);
          appendEvent("error", uiText("Status check failed", "状态检查失败"), message);
        }
        return;
      }

      const summary = getWorkerSummary(payload);
      if (!summary) {
        if (!quiet) {
          setLaunchError(cloudText("status_missing_worker_details"));
          appendEvent("error", uiText("Status check failed", "状态检查失败"), uiText("Worker summary missing", "缺少 Worker 摘要"));
        }
        return;
      }

      const previousStatus = worker?.workerId === summary.workerId ? worker.status : null;

      const nextWorker: WorkerLaunch =
        worker && worker.workerId === summary.workerId
          ? {
              ...worker,
              workerName: summary.workerName,
              status: summary.status,
              provider: summary.provider,
              instanceUrl: summary.instanceUrl
            }
          : {
              workerId: summary.workerId,
              workerName: summary.workerName,
              status: summary.status,
              provider: summary.provider,
              instanceUrl: summary.instanceUrl,
              openworkUrl: summary.instanceUrl,
              workspaceId: null,
              clientToken: null,
              hostToken: null
            };

      const resolvedWorker = await withResolvedOpenworkCredentials(nextWorker, { quiet: true });
      setWorker(resolvedWorker);

      setWorkerLookupId(summary.workerId);

      if (!quiet) {
        setLaunchStatus(`${uiText("Worker", "Worker")} ${summary.workerName} ${uiText("is currently", "当前状态为")} ${summary.status}.`);
        appendEvent("info", uiText("Status refreshed", "状态已刷新"), `${summary.workerName}: ${summary.status}`);
      } else if (previousStatus && previousStatus !== summary.status) {
        setLaunchStatus(getWorkerStatusCopy(summary.status));

        if (summary.status === "healthy") {
          appendEvent("success", uiText("Provisioning complete", "创建完成"), `${summary.workerName} ${uiText("is ready", "已就绪")}`);
        } else if (summary.status === "failed") {
          appendEvent("error", uiText("Provisioning failed", "创建失败"), `${summary.workerName} ${uiText("failed to provision", "创建失败")}`);
        } else {
          appendEvent("info", uiText("Provisioning update", "创建状态更新"), `${summary.workerName}: ${summary.status}`);
        }
      }

      if (!background) {
        void refreshWorkers({ keepSelection: true });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : uiText("Unknown network error", "未知网络错误");
      if (!quiet) {
        setLaunchError(message);
        appendEvent("error", uiText("Status check failed", "状态检查失败"), message);
      }
    } finally {
      if (!background) {
        setActionBusy(null);
      }
    }
  }

  async function handleGenerateKey() {
    if (!user) {
      setLaunchError(cloudText("sign_in_before_fetch_token"));
      return;
    }

    const id = workerLookupId.trim() || worker?.workerId || workers[0]?.workerId || "";
    if (!id) {
      setLaunchError(cloudText("launch_worker_first_fetch_token"));
      return;
    }

    setWorkerLookupId(id);

    setActionBusy("token");
    setLaunchError(null);

    try {
      const { response, payload } = await requestJson(`/v1/workers/${encodeURIComponent(id)}/tokens`, {
        method: "POST",
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
        body: JSON.stringify({})
      });

      if (!response.ok) {
        const message = getErrorMessage(payload, `${uiText("Token fetch failed", "令牌获取失败")} ${response.status}.`);
        setLaunchError(message);
        appendEvent("error", uiText("Token fetch failed", "令牌获取失败"), message);
        return;
      }

      const tokens = getWorkerTokens(payload);
      if (!tokens) {
        setLaunchError(cloudText("token_response_missing_values"));
        appendEvent("error", uiText("Token fetch failed", "令牌获取失败"), uiText("Missing token payload", "缺少令牌数据"));
        return;
      }

      const nextWorker: WorkerLaunch =
        worker && worker.workerId === id
          ? {
              ...worker,
              openworkUrl: tokens.openworkUrl ?? worker.openworkUrl,
              workspaceId: tokens.workspaceId ?? worker.workspaceId,
              clientToken: tokens.clientToken,
              hostToken: tokens.hostToken
            }
          : {
              workerId: id,
              workerName: uiText("Existing worker", "已有 Worker"),
              status: "unknown",
              provider: null,
              instanceUrl: null,
              openworkUrl: tokens.openworkUrl,
              workspaceId: tokens.workspaceId,
              clientToken: tokens.clientToken,
              hostToken: tokens.hostToken
            };

      const resolvedWorker = await withResolvedOpenworkCredentials(nextWorker, { quiet: true });
      setWorker(resolvedWorker);

      setLaunchStatus(uiText("Worker is ready to connect.", "Worker 已可连接。"));
      appendEvent("success", uiText("Access token ready", "访问令牌已就绪"), `Worker ID ${id}`);
      void refreshWorkers({ keepSelection: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : uiText("Unknown network error", "未知网络错误");
      setLaunchError(message);
      appendEvent("error", uiText("Token fetch failed", "令牌获取失败"), message);
    } finally {
      setActionBusy(null);
    }
  }

  async function handleDeleteWorker(workerId: string) {
    if (!user) {
      setLaunchError(cloudText("sign_in_before_delete"));
      return;
    }

    if (deleteBusyWorkerId || actionBusy !== null || launchBusy) {
      return;
    }

    const target = workers.find((entry) => entry.workerId === workerId) ?? null;
    const workerLabel = target?.workerName ?? uiText("this worker", "该 Worker");

    if (typeof window !== "undefined") {
      const confirmed = window.confirm(uiText(`Delete "${workerLabel}"? This removes it from your worker list.`, `确认删除 "${workerLabel}"？删除后将从 Worker 列表移除。`));
      if (!confirmed) {
        return;
      }
    }

    setDeleteBusyWorkerId(workerId);
    setLaunchError(null);

    try {
      const { response, payload } = await requestJson(`/v1/workers/${encodeURIComponent(workerId)}`, {
        method: "DELETE",
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined
      });

      if (response.status !== 204 && !response.ok) {
        const message = getErrorMessage(payload, `${uiText("Delete failed", "删除失败")} ${response.status}.`);
        setLaunchError(message);
        appendEvent("error", uiText("Delete failed", "删除失败"), message);
        return;
      }

      setWorkers((current) => current.filter((entry) => entry.workerId !== workerId));

      setWorker((current) => {
        if (!current || current.workerId !== workerId) {
          return current;
        }
        return null;
      });

      setWorkerLookupId((current) => (current === workerId ? "" : current));

      if (typeof window !== "undefined" && worker?.workerId === workerId) {
        window.localStorage.removeItem(LAST_WORKER_STORAGE_KEY);
      }

      setLaunchStatus(`${uiText("Deleted", "已删除")} ${workerLabel}.`);
      appendEvent("success", uiText("Worker deleted", "Worker 已删除"), workerLabel);
      await refreshWorkers({ keepSelection: false });
    } catch (error) {
      const message = error instanceof Error ? error.message : uiText("Unknown network error", "未知网络错误");
      setLaunchError(message);
      appendEvent("error", uiText("Delete failed", "删除失败"), message);
    } finally {
      setDeleteBusyWorkerId(null);
    }
  }

  return (
    <section className={`ow-card${isShellStep ? " ow-card-shell" : ""}`}>
      {!isShellStep ? (
        <div className="ow-progress-track">
          <span className="ow-progress-fill" style={{ width: progressWidth }} />
        </div>
      ) : null}

      <div className="ow-card-body">

        {step === 1 ? (
          <div className="ow-stack">
            <div className="ow-heading-block">
              <span className="ow-icon-chip">01</span>
              <h1 className="ow-title">{authMode === "sign-up" ? uiText("Get started", "开始使用") : uiText("Welcome back", "欢迎回来")}</h1>
              <p className="ow-subtitle">
                {authMode === "sign-up"
                  ? getAuthInfoForMode("sign-up")
                  : getAuthInfoForMode("sign-in")}
              </p>
            </div>

            <form className="ow-stack" onSubmit={handleAuthSubmit}>
              <label className="ow-field-block">
                <span className="ow-field-label">{uiText("Email", "邮箱")}</span>
                <input
                  className="ow-input"
                  type="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  autoComplete="email"
                  required
                />
              </label>

              <label className="ow-field-block">
                <span className="ow-field-label">{uiText("Password", "密码")}</span>
                <input
                  className="ow-input"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete={authMode === "sign-up" ? "new-password" : "current-password"}
                  required
                />
              </label>

              <button type="submit" className="ow-btn-primary" disabled={authBusy}>
                {authBusy ? uiText("Working...", "处理中...") : authMode === "sign-in" ? uiText("Sign in", "登录") : uiText("Create account", "创建账号")}
              </button>

              <button type="button" className="ow-btn-secondary w-full" onClick={() => void handleGitHubSignIn()} disabled={authBusy}>
                {uiText("Continue with GitHub", "使用 GitHub 继续")}
              </button>
            </form>

            <div className="ow-inline-row">
              <p className="ow-caption">{authMode === "sign-in" ? uiText("Need an account?", "还没有账号？") : uiText("Already have an account?", "已经有账号了？")}</p>
              <button
                type="button"
                className="ow-link"
                onClick={() => {
                  const nextMode = authMode === "sign-in" ? "sign-up" : "sign-in";
                  setAuthMode(nextMode);
                  setAuthInfo(getAuthInfoForMode(nextMode));
                  setAuthError(null);
                }}
              >
                {authMode === "sign-in" ? uiText("Create account", "创建账号") : uiText("Switch to sign in", "切换到登录")}
              </button>
            </div>

            <div className="ow-note-box">
              <p>{authInfo}</p>
              {authError ? <p className="ow-error-text">{authError}</p> : null}
            </div>
          </div>
        ) : null}

        {step === 2 ? (
          <div className="flex h-full flex-col gap-3">
            <div className="mb-3 flex items-center justify-between rounded-[18px] border border-slate-200 bg-white p-2 lg:hidden">
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShellView("workers")}
                  className={`rounded-[12px] px-3 py-1.5 text-sm font-medium transition ${
                    shellView === "workers" ? "bg-[#1B29FF]/10 text-[#1B29FF]" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {uiText("Workers", "Workers")}
                </button>
                <button
                  type="button"
                  onClick={() => setShellView("billing")}
                  className={`rounded-[12px] px-3 py-1.5 text-sm font-medium transition ${
                    shellView === "billing" ? "bg-[#1B29FF]/10 text-[#1B29FF]" : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {uiText("Billing", "账单")}
                </button>
              </div>
              <button
                type="button"
                className="rounded-[12px] border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-900 disabled:cursor-not-allowed disabled:opacity-50"
                onClick={() => void handleSignOut()}
                disabled={authBusy}
              >
                {authBusy ? uiText("Signing out...", "正在退出...") : uiText("Log out", "退出登录")}
              </button>
            </div>

            {shellView === "workers" ? (
              <div className="flex h-full min-h-0 flex-col gap-4 lg:flex-row">
                <aside className="hidden h-full w-[260px] shrink-0 flex-col justify-between rounded-[32px] border border-slate-200 bg-white p-5 shadow-sm lg:flex">
                  <div>
                    <div className="mb-6">
                      <div className="mb-3 flex items-center gap-2 px-2 text-xs font-medium uppercase tracking-[0.08em] text-slate-400">
                        <span>{uiText("Menu", "菜单")}</span>
                      </div>
                      <nav className="space-y-1">
                        <button
                          type="button"
                          className="w-full rounded-[14px] bg-[#1B29FF]/10 px-3 py-2.5 text-left text-sm font-medium text-[#1B29FF] transition"
                          onClick={() => setShellView("workers")}
                        >
                          {uiText("Workers", "Workers")}
                        </button>
                        <button
                          type="button"
                          className="w-full rounded-[14px] px-3 py-2.5 text-left text-sm font-medium text-slate-500 transition hover:bg-slate-50"
                          onClick={() => setShellView("billing")}
                        >
                          {uiText("Billing", "账单")}
                        </button>
                        <span className="block rounded-[14px] px-3 py-2.5 text-sm font-medium text-slate-400">{uiText("Settings", "设置")}</span>
                        <span className="block rounded-[14px] px-3 py-2.5 text-sm font-medium text-slate-400">{uiText("Help Center", "帮助中心")}</span>
                      </nav>
                    </div>
                  </div>

                  <div className="rounded-[22px] border border-slate-200 bg-[#F8F9FA] p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400">{uiText("Signed in", "已登录")}</p>
                      <p className="mt-1 break-all text-sm font-medium text-slate-700">{(user?.email ?? email) || uiText("account", "账号")}</p>
                    <button
                      type="button"
                      className="mt-4 w-full rounded-[12px] bg-slate-900 px-3 py-2 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
                      onClick={() => void handleSignOut()}
                      disabled={authBusy}
                    >
                      {authBusy ? uiText("Signing out...", "正在退出...") : uiText("Log out", "退出登录")}
                    </button>
                  </div>
                </aside>

                <section className="flex h-full w-full shrink-0 flex-col rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm md:w-[340px]">
                  <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-xl font-semibold tracking-tight text-slate-900">{uiText("Workers", "Workers")}</h2>
                    <button
                      type="button"
                      className="rounded-full bg-[#1B29FF] p-2.5 text-white transition hover:bg-[#151FDA]"
                      onClick={() => setShowLaunchForm((current) => !current)}
                    >
                      {showLaunchForm ? "-" : "+"}
                    </button>
                  </div>

                  {showLaunchForm ? (
                    <div className="mb-5 rounded-[20px] border border-slate-200 bg-slate-50 p-4">
                      <label className="mb-3 block">
                        <span className="mb-1 block text-xs font-bold uppercase tracking-[0.08em] text-slate-500">{uiText("Worker Name", "Worker 名称")}</span>
                        <input
                          className="w-full rounded-[12px] border border-slate-300 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-[#1B29FF] focus:ring-2 focus:ring-[#1B29FF]/15"
                          value={workerName}
                          onChange={(event) => setWorkerName(event.target.value)}
                          maxLength={80}
                        />
                      </label>

                      <button
                        type="button"
                        className="w-full rounded-[12px] bg-[#1B29FF] px-3 py-2.5 text-sm font-semibold text-white transition hover:bg-[#151FDA] disabled:cursor-not-allowed disabled:opacity-60"
                        onClick={handleLaunchWorker}
                        disabled={!user || launchBusy || worker?.status === "provisioning"}
                      >
                        {launchBusy
                          ? uiText("Starting worker...", "正在启动 Worker...")
                          : worker?.status === "provisioning"
                            ? uiText("Worker is starting...", "Worker 启动中...")
                            : uiText(`Launch "${workerName || "Cloud Worker"}"`, `启动 "${workerName || "Cloud Worker"}"`)}
                      </button>

                      {(launchStatus || launchError) && showLaunchForm ? (
                        <div className="mt-3 rounded-[12px] border border-slate-200 bg-white px-3 py-2">
                          <p className="text-xs text-slate-600">{launchStatus}</p>
                          {launchError ? <p className="mt-1 text-xs font-medium text-rose-600">{launchError}</p> : null}
                        </div>
                      ) : null}

                      {checkoutUrl ? (
                        <div className="mt-3 rounded-[12px] border border-amber-200 bg-amber-50 px-3 py-2.5">
                          <p className="text-sm font-semibold text-amber-800">{uiText("Payment needed before launch", "启动前需要完成支付")}</p>
                          <a
                            href={checkoutUrl}
                            rel="noreferrer"
                            className="mt-2 inline-flex rounded-[10px] border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-100"
                          >
                            {uiText("Continue to checkout", "继续支付")}
                          </a>
                        </div>
                      ) : null}
                    </div>
                  ) : null}

                  <div className="mb-5 flex gap-2 overflow-x-auto pb-1">
                    <input
                      className="min-w-[170px] rounded-xl border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700 outline-none focus:border-[#1B29FF]"
                      value={workerQuery}
                      onChange={(event) => setWorkerQuery(event.target.value)}
                      placeholder={cloudText("search_placeholder")}
                      aria-label={uiText("Search workers", "搜索 Worker")}
                    />
                    <select
                      className="rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-700 outline-none"
                      value={workerStatusFilter}
                      onChange={(event) => setWorkerStatusFilter(event.target.value as WorkerStatusBucket | "all")}
                    >
                      <option value="all">{uiText("All", "全部")}</option>
                      <option value="ready">{uiText("Ready", "就绪")}</option>
                      <option value="starting">{uiText("Starting", "启动中")}</option>
                      <option value="attention">{uiText("Attention", "需关注")}</option>
                    </select>
                  </div>

                  {workersBusy ? <p className="mb-2 text-xs text-slate-500">{uiText("Loading workers...", "正在加载 Worker...")}</p> : null}
                  {workersError ? <p className="mb-2 text-xs font-medium text-rose-600">{workersError}</p> : null}

                  <div className="min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
                    {filteredWorkers.map((item) => {
                      const meta = getWorkerStatusMeta(item.status);
                      const isActive = workerLookupId === item.workerId;
                      const statusPill =
                        meta.bucket === "ready"
                          ? "bg-[#E8F5E9] text-[#2E7D32]"
                          : meta.bucket === "starting"
                            ? "bg-amber-100 text-amber-700"
                            : meta.bucket === "attention"
                              ? "bg-rose-100 text-rose-700"
                              : "bg-slate-100 text-slate-500";

                      const statusDot =
                        meta.bucket === "ready"
                          ? "bg-[#2E7D32]"
                          : meta.bucket === "starting"
                            ? "bg-amber-500"
                            : meta.bucket === "attention"
                              ? "bg-rose-500"
                              : "bg-slate-400";

                      return (
                        <button
                          key={item.workerId}
                          type="button"
                          onClick={() => {
                            setWorkerLookupId(item.workerId);
                            setWorker((current) => listItemToWorker(item, current));
                          }}
                          className={`w-full rounded-[20px] border p-4 text-left transition-all ${
                            isActive
                              ? "border-[#1B29FF] bg-[#1B29FF]/[0.03] ring-1 ring-[#1B29FF]/30"
                              : "border-slate-100 bg-white hover:border-slate-300"
                          }`}
                        >
                          <div className="mb-1 flex items-center justify-between gap-2">
                            <span className={`truncate pr-2 text-sm font-semibold ${isActive ? "text-[#1B29FF]" : "text-slate-700"}`}>
                              {item.workerName}
                            </span>
                            {item.isMine ? (
                              <span className="shrink-0 rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                {uiText("Yours", "我的")}
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-3 flex items-center justify-between">
                            <span className="font-mono text-xs font-medium text-slate-400">{getWorkerAddressLabel(item)}</span>
                            <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusPill}`}>
                              <span className={`h-1.5 w-1.5 rounded-full ${statusDot}`} />
                              {meta.label}
                            </span>
                          </div>
                        </button>
                      );
                    })}
                  </div>

                  {workers.length > 0 && filteredWorkers.length === 0 ? (
                    <p className="mt-3 text-xs text-slate-500">{uiText("No workers match this filter.", "没有匹配当前筛选条件的 Worker。")}</p>
                  ) : null}

                  {workers.length === 0 && !workersBusy ? (
                    <p className="mt-3 text-xs text-slate-500">{uiText("No workers yet. Create one to get started.", "还没有 Worker，先创建一个开始使用。")}</p>
                  ) : null}
                </section>

                <section className="flex h-full min-h-0 min-w-0 flex-1 flex-col rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
                  {selectedWorker ? (
                    <>
                      <div className="mb-2 px-1">
                        <h1 className="mb-1 text-2xl font-bold tracking-tight text-slate-900">{uiText("Overview", "概览")}</h1>
                      </div>

                      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto pb-2">
                        <div className="rounded-[28px] border border-slate-100 bg-white p-6">
                          <h2 className="mb-2 text-3xl font-bold tracking-tight text-slate-900">
                            {activeWorker?.workerName ?? selectedWorker.workerName}
                          </h2>
                          <p className="mb-6 text-sm text-slate-500">{getWorkerStatusCopy(selectedWorkerStatus)}</p>

                          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                            <div className="rounded-[20px] border border-slate-100 bg-white p-4">
                              <p className="text-sm font-medium text-slate-500">{uiText("Status", "状态")}</p>
                              <p className="mt-2 text-2xl font-bold text-slate-900">{selectedStatusMeta.label}</p>
                            </div>
                            <div className="rounded-[20px] border border-slate-100 bg-white p-4">
                              <p className="text-sm font-medium text-slate-500">{uiText("Connection", "连接")}</p>
                              <p className="mt-2 text-2xl font-bold text-slate-900">{openworkDeepLink ? uiText("Ready", "就绪") : uiText("Preparing", "准备中")}</p>
                            </div>
                          </div>
                        </div>

                        <div className="rounded-[28px] border border-slate-100 bg-white p-6">
                          <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                            <div>
                              <h3 className="text-lg font-bold tracking-tight text-slate-900">{uiText("Connection Details", "连接详情")}</h3>
                              <p className="text-sm text-slate-500">{uiText("Access and manage your worker instance.", "访问并管理你的 Worker 实例。")}</p>
                            </div>

                            <div className="flex flex-wrap items-center gap-2">
                              <button
                                type="button"
                                className="rounded-[14px] bg-[#1B29FF] px-6 py-3 text-sm font-semibold text-white shadow-md shadow-[#1B29FF]/25 transition hover:bg-[#151FDA] disabled:cursor-not-allowed disabled:opacity-60"
                                onClick={() => {
                                  if (!openworkDeepLink) {
                                    return;
                                  }
                                  window.location.href = openworkDeepLink;
                                }}
                                disabled={!openworkDeepLink || selectedStatusMeta.bucket !== "ready"}
                              >
                                {openworkDeepLink ? uiText("Open in OpenWork", "在 OpenWork 中打开") : uiText("Preparing connection...", "连接准备中...")}
                              </button>

                              {openworkAppConnectUrl ? (
                                <a
                                  href={openworkAppConnectUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className={`rounded-[14px] border px-5 py-3 text-sm font-semibold transition ${
                                    selectedStatusMeta.bucket === "ready"
                                      ? "border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:text-slate-900"
                                      : "pointer-events-none cursor-not-allowed border-slate-200 bg-slate-100 text-slate-400"
                                  }`}
                                  aria-disabled={selectedStatusMeta.bucket !== "ready"}
                                >
                                  {uiText("Open in App", "在 App 中打开")}
                                </a>
                              ) : null}
                            </div>
                          </div>

                          <div className="rounded-[14px] border border-slate-100 bg-slate-50 px-4 py-3">
                            <p className="text-sm text-slate-600">
                              {openworkDeepLink
                                ? openworkAppConnectUrl
                                  ? uiText("You are all set. Open in OpenWork or Open in App to start working.", "已全部就绪。可在 OpenWork 或 App 中打开并开始工作。")
                                  : uiText("You are all set. Open in OpenWork to start working.", "已全部就绪。可在 OpenWork 中打开并开始工作。")
                                : uiText("We are still preparing your connection. The button will unlock when ready.", "正在准备连接，完成后按钮会自动可用。")}
                            </p>
                          </div>

                          <button
                            type="button"
                            className="mt-4 text-sm font-semibold text-[#1B29FF] transition hover:text-[#151FDA]"
                            onClick={() =>
                              setShowAdvancedOptions((current) => {
                                if (current) {
                                  setOpenAccordion(null);
                                }
                                return !current;
                              })
                            }
                          >
                            {showAdvancedOptions ? uiText("Hide advanced options", "隐藏高级选项") : uiText("Need manual setup? Show advanced options", "需要手动配置？显示高级选项")}
                          </button>

                          {showAdvancedOptions ? (
                            <div className="mt-4 space-y-4">
                              <div>
                                <label className="mb-2 block text-xs font-bold uppercase tracking-wider text-slate-400">{uiText("Connection URL", "连接 URL")}</label>
                                <div className="flex items-center gap-2 rounded-[14px] border border-slate-200 bg-[#F8F9FA] p-1.5">
                                  <input
                                    type="text"
                                    readOnly
                                    value={openworkConnectUrl ?? uiText("Connection URL is still preparing...", "连接 URL 仍在准备中...")}
                                    className="w-full flex-1 bg-transparent px-3 py-2 font-mono text-xs text-slate-600 outline-none"
                                    onClick={(event) => event.currentTarget.select()}
                                  />
                                  <button
                                    type="button"
                                    className="rounded-xl border border-transparent bg-white px-3 py-2 text-xs font-medium text-slate-500 transition hover:border-slate-200 hover:text-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
                                    disabled={!openworkConnectUrl}
                                    onClick={() => void copyToClipboard("openwork-url", openworkConnectUrl)}
                                  >
                                    {copiedField === "openwork-url" ? uiText("Copied", "已复制") : uiText("Copy", "复制")}
                                  </button>
                                </div>
                                {!openworkDeepLink || !openworkConnectUrl || (!hasWorkspaceScopedUrl && openworkConnectUrl) ? (
                                  <p className="mt-2 text-xs text-slate-500">
                                    {!openworkDeepLink
                                      ? uiText("Getting connection details ready...", "正在准备连接详情...")
                                      : !openworkConnectUrl
                                        ? uiText("Keep this page open for a moment.", "请保持当前页面打开片刻。")
                                        : uiText("Finishing your workspace URL...", "正在完成工作区 URL...")}
                                  </p>
                                ) : null}
                              </div>

                              <div className="overflow-hidden rounded-[20px] border border-slate-100">
                                <div className="border-b border-slate-100">
                                  <button
                                    type="button"
                                    onClick={() => setOpenAccordion((current) => (current === "connect" ? null : "connect"))}
                                    className="flex w-full items-center justify-between p-4 text-left transition hover:bg-slate-50"
                                  >
                                    <span className="text-sm font-semibold text-slate-800">{uiText("Manual connect details", "手动连接信息")}</span>
                                    <span className="text-sm text-slate-400">{openAccordion === "connect" ? "v" : ">"}</span>
                                  </button>
                                  {openAccordion === "connect" ? (
                                    <div className="space-y-3 px-4 pb-4">
                                      <CredentialRow
                                        label={uiText("OpenWork worker URL", "OpenWork Worker URL")}
                                        value={openworkConnectUrl}
                                        placeholder={cloudText("url_appears_ready")}
                                        canCopy={Boolean(openworkConnectUrl)}
                                        copied={copiedField === "manual-openwork-url"}
                                        onCopy={() => void copyToClipboard("manual-openwork-url", openworkConnectUrl)}
                                      />

                                      <CredentialRow
                                        label={uiText("Access token", "访问令牌")}
                                        value={activeWorker?.clientToken ?? null}
                                        placeholder={cloudText("use_worker_actions_refresh")}
                                        canCopy={Boolean(activeWorker?.clientToken)}
                                        copied={copiedField === "access-token"}
                                        onCopy={() => void copyToClipboard("access-token", activeWorker?.clientToken ?? null)}
                                      />
                                    </div>
                                  ) : null}
                                </div>

                                <div className="border-b border-slate-100">
                                  <button
                                    type="button"
                                    onClick={() => setOpenAccordion((current) => (current === "actions" ? null : "actions"))}
                                    className="flex w-full items-center justify-between p-4 text-left transition hover:bg-slate-50"
                                  >
                                    <span className="text-sm font-semibold text-slate-800">{uiText("Worker actions", "Worker 操作")}</span>
                                    <span className="text-sm text-slate-400">{openAccordion === "actions" ? "v" : ">"}</span>
                                  </button>
                                  {openAccordion === "actions" ? (
                                    <div className="flex flex-wrap gap-2 px-4 pb-4">
                                      <button
                                        type="button"
                                        className="rounded-[10px] border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                        onClick={() => void refreshWorkers({ keepSelection: true })}
                                        disabled={workersBusy || actionBusy !== null}
                                      >
                                        {workersBusy ? uiText("Refreshing...", "刷新中...") : uiText("Refresh list", "刷新列表")}
                                      </button>
                                      <button
                                        type="button"
                                        className="rounded-[10px] border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                        onClick={() => void handleCheckStatus({ workerId: selectedWorker.workerId })}
                                        disabled={actionBusy !== null}
                                      >
                                        {actionBusy === "status" ? uiText("Checking...", "检查中...") : uiText("Check status", "检查状态")}
                                      </button>
                                      <button
                                        type="button"
                                        className="rounded-[10px] border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                                        onClick={handleGenerateKey}
                                        disabled={actionBusy !== null}
                                      >
                                        {actionBusy === "token" ? uiText("Fetching...", "获取中...") : uiText("Refresh token", "刷新令牌")}
                                      </button>
                                      <button
                                        type="button"
                                        className="rounded-[10px] border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-50"
                                        onClick={() => void handleDeleteWorker(selectedWorker.workerId)}
                                        disabled={deleteBusyWorkerId !== null || actionBusy !== null || launchBusy}
                                      >
                                        {deleteBusyWorkerId === selectedWorker.workerId ? uiText("Deleting...", "删除中...") : uiText("Delete worker", "删除 Worker")}
                                      </button>
                                    </div>
                                  ) : null}
                                </div>

                                <div>
                                  <button
                                    type="button"
                                    onClick={() => setOpenAccordion((current) => (current === "advanced" ? null : "advanced"))}
                                    className="flex w-full items-center justify-between p-4 text-left transition hover:bg-slate-50"
                                  >
                                    <span className="text-sm font-semibold text-slate-800">{uiText("Advanced details", "高级详情")}</span>
                                    <span className="text-sm text-slate-400">{openAccordion === "advanced" ? "v" : ">"}</span>
                                  </button>
                                  {openAccordion === "advanced" ? (
                                    <div className="space-y-3 px-4 pb-4">
                                      <CredentialRow
                                        label={uiText("Worker host URL", "Worker 主机 URL")}
                                        value={activeWorker?.instanceUrl ?? null}
                                        placeholder={cloudText("host_url")}
                                        canCopy={Boolean(activeWorker?.instanceUrl)}
                                        copied={copiedField === "worker-host-url"}
                                        onCopy={() => void copyToClipboard("worker-host-url", activeWorker?.instanceUrl ?? null)}
                                      />

                                      <CredentialRow
                                        label={uiText("Worker ID", "Worker ID")}
                                        value={(activeWorker?.workerId ?? workerLookupId) || null}
                                        placeholder={cloudText("worker_id")}
                                        canCopy={Boolean(activeWorker?.workerId || workerLookupId)}
                                        copied={copiedField === "worker-id"}
                                        onCopy={() => void copyToClipboard("worker-id", (activeWorker?.workerId ?? workerLookupId) || null)}
                                      />

                                      {events.length > 0 ? (
                                        <div className="rounded-[12px] border border-slate-200 bg-slate-50 p-3">
                                          <p className="mb-2 text-xs font-bold uppercase tracking-[0.08em] text-slate-500">{uiText("Recent activity", "最近活动")}</p>
                                          <ul className="space-y-2">
                                            {events.map((entry) => (
                                              <li key={entry.id} className="rounded-[10px] border border-slate-100 bg-white px-3 py-2">
                                                <div className="flex items-center justify-between gap-2 text-xs font-semibold text-slate-700">
                                                  <span>{entry.label}</span>
                                                  <span className="font-mono text-[10px] text-slate-500">{new Date(entry.at).toLocaleTimeString()}</span>
                                                </div>
                                                <p className="mt-1 text-xs text-slate-600">{entry.detail}</p>
                                              </li>
                                            ))}
                                          </ul>
                                        </div>
                                      ) : null}
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex min-h-[360px] items-center justify-center rounded-[24px] border border-dashed border-slate-300 bg-slate-50">
                      <div className="px-6 text-center">
                        <p className="text-lg font-semibold text-slate-900">{uiText("Select a worker", "选择一个 Worker")}</p>
                        <p className="mt-1 text-sm text-slate-500">{uiText("Pick a worker from the list to see details and connect.", "从列表中选择 Worker 以查看详情并完成连接。")}</p>
                      </div>
                    </div>
                  )}
                </section>
              </div>
            ) : (
              <section className="flex h-full flex-1 flex-col rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm md:p-8">
                <h2 className="text-2xl font-bold tracking-tight text-slate-900">{uiText("Billing", "账单")}</h2>
                <p className="mt-1 text-sm text-slate-500">{uiText("Handle checkout when launching a new worker.", "在启动新 Worker 时处理结账流程。")}</p>
                {checkoutUrl ? (
                  <div className="mt-5 rounded-[16px] border border-amber-200 bg-amber-50 p-4">
                    <p className="text-sm font-semibold text-amber-800">{uiText("Checkout in progress", "支付进行中")}</p>
                    <a
                      href={checkoutUrl}
                      rel="noreferrer"
                      className="mt-2 inline-flex rounded-[10px] border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-100"
                    >
                      {uiText("Continue to checkout", "继续支付")}
                    </a>
                  </div>
                ) : (
                  <p className="mt-4 text-sm text-slate-600">{uiText("No payment action right now.", "当前暂无支付操作。")}</p>
                )}
              </section>
            )}
          </div>
        ) : null}

      </div>
    </section>
  );
}
