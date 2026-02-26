import type http from "node:http";

export type RouterLang = "en" | "zh";

const DEFAULT_LANG: RouterLang = "en";

const ROUTER_MESSAGES = {
  en: {
    not_supported: "Not supported",
    payload_too_large: "Payload too large",
    token_required: "Token is required",
    token_required_lower: "token is required",
    slack_tokens_required: "Slack botToken and appToken are required",
    bot_and_app_tokens_required: "botToken and appToken are required",
    id_required: "id is required",
    channel_and_peer_required: "channel and peerId are required",
    channel_text_and_directory_or_peer_required: "channel, text, and either directory or peerId are required",
    not_found: "Not found",
    internal_error: "Internal error",
    directory_required: "Directory is required.",
    invalid_channel: "Invalid channel",
    peer_and_directory_required: "peerId and directory are required",
    peer_required: "peerId is required",
    text_required: "text is required",
    directory_or_peer_required: "directory or peerId is required",
    adapter_not_running: "Adapter not running",
    invalid_telegram_peer_binding_removed: "Invalid Telegram peerId binding removed (expected numeric chat_id)",
    incoming_user_message: "Incoming user message:",
    failed_create_session: "Failed to create session",
    env_identity_cannot_be_deleted: "env identity cannot be deleted",
    env_identity_reserved: "identity id 'env' is reserved",
    pairing_code_hash_required: "pairingCodeHash is required when Telegram access is private",
    telegram_numeric_chat_id_required:
      "Telegram requires a numeric chat_id for direct targets. Usernames like @name cannot be used as peerId.",
  },
  zh: {
    not_supported: "不支持该操作",
    payload_too_large: "请求体过大",
    token_required: "需要提供 Token",
    token_required_lower: "需要提供 token",
    slack_tokens_required: "需要提供 Slack botToken 和 appToken",
    bot_and_app_tokens_required: "需要提供 botToken 和 appToken",
    id_required: "需要提供 id",
    channel_and_peer_required: "需要提供 channel 和 peerId",
    channel_text_and_directory_or_peer_required: "需要提供 channel、text，以及 directory 或 peerId",
    not_found: "未找到",
    internal_error: "内部错误",
    directory_required: "目录不能为空。",
    invalid_channel: "无效的 channel",
    peer_and_directory_required: "需要提供 peerId 和 directory",
    peer_required: "需要提供 peerId",
    text_required: "text 不能为空",
    directory_or_peer_required: "需要提供 directory 或 peerId",
    adapter_not_running: "适配器未运行",
    invalid_telegram_peer_binding_removed: "已移除无效的 Telegram peerId 绑定（应为数字 chat_id）",
    incoming_user_message: "收到的用户消息：",
    failed_create_session: "创建会话失败",
    env_identity_cannot_be_deleted: "不能删除 env 身份",
    env_identity_reserved: "identity id 'env' 为保留值",
    pairing_code_hash_required: "Telegram 私有模式需要 pairingCodeHash",
    telegram_numeric_chat_id_required: "Telegram 直发目标需要数字 chat_id，不能使用 @用户名 作为 peerId。",
  },
} as const;

export type RouterTextKey = keyof (typeof ROUTER_MESSAGES)["en"];

function normalizeLang(input: string | undefined): RouterLang {
  const value = (input ?? "").trim().toLowerCase();
  if (!value) return DEFAULT_LANG;
  if (value.startsWith("zh")) return "zh";
  return "en";
}

function parseAcceptLanguage(input: string | undefined): RouterLang | null {
  const raw = (input ?? "").trim();
  if (!raw) return null;
  const candidate = raw
    .split(",")
    .map((part) => part.trim().split(";")[0]?.trim() ?? "")
    .find(Boolean);
  if (!candidate) return null;
  return normalizeLang(candidate);
}

export function resolveRouterLangFromEnv(): RouterLang {
  return normalizeLang(process.env.OPENWORK_LANG);
}

export function resolveRouterLangFromRequest(req: Pick<http.IncomingMessage, "headers">): RouterLang {
  const header = req.headers["accept-language"];
  const headerValue = Array.isArray(header) ? header.join(",") : header;
  return parseAcceptLanguage(headerValue) ?? resolveRouterLangFromEnv();
}

export function routerText(key: RouterTextKey, lang: RouterLang): string {
  return ROUTER_MESSAGES[lang][key] ?? ROUTER_MESSAGES.en[key];
}
