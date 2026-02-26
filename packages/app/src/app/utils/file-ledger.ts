import type { MessageWithParts } from "../types";

export type FileLedgerCategory = "input" | "reference" | "output";
export type FileLedgerSource = "upload" | "mention" | "tool";

export type FileLedgerItem = {
  id: string;
  path: string;
  name: string;
  category: FileLedgerCategory;
  source: FileLedgerSource;
  firstSeenAt: number;
  lastSeenAt: number;
  messageId?: string;
};

export type FileLedger = {
  all: FileLedgerItem[];
  input: FileLedgerItem[];
  reference: FileLedgerItem[];
  output: FileLedgerItem[];
};

type DeriveFileLedgerOptions = {
  maxMessages?: number;
};

const FILE_URL_RE = /^file:\/\//i;
const DATA_URL_RE = /^data:/i;
const HTTP_URL_RE = /^https?:\/\//i;
const PATH_PATTERN =
  /(?:^|[\s"'`([{])((?:[a-zA-Z]:[/\\]|\.{1,2}[/\\]|~[/\\]|[/\\])[\w./\\\-]*\.[a-z][a-z0-9]{0,9}|[\w.\-]+[/\\][\w./\\\-]*\.[a-z][a-z0-9]{0,9})/gi;

const toRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === "object" ? (value as Record<string, unknown>) : {};

const normalizePath = (value: string) => value.trim().replace(/[\\/]+/g, "/");

const basename = (value: string) => {
  const normalized = normalizePath(value);
  const parts = normalized.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? normalized;
};

const stripWorkspacePrefix = (value: string) => {
  if (/^\/workspace\//i.test(value)) return value.replace(/^\/workspace\//i, "");
  if (/^workspace\//i.test(value)) return value.replace(/^workspace\//i, "");
  const nested = value.match(/\/workspaces\/[^/]+\/(.+)$/i);
  if (nested?.[1]) return nested[1];
  return value;
};

const decodeFileUrl = (raw: string): string | null => {
  let value = raw.trim().replace(FILE_URL_RE, "");
  if (!value) return null;
  value = value.replace(/^localhost\//i, "");
  try {
    value = decodeURIComponent(value);
  } catch {
    // ignore malformed encodings
  }
  if (!value.startsWith("/") && !/^[a-zA-Z]:\//.test(value)) {
    value = `/${value}`;
  }
  return normalizePath(value);
};

const cleanPathCandidate = (raw: string, options?: { allowBareName?: boolean }): string | null => {
  if (!raw || typeof raw !== "string") return null;
  let value = raw.trim().replace(/^[`'"([{<]+|[`'")\]}>.,;:]+$/g, "");
  if (!value) return null;
  if (value.length > 600) return null;
  if (value.includes("\n")) return null;
  if (DATA_URL_RE.test(value)) return null;
  if (HTTP_URL_RE.test(value)) return null;

  if (FILE_URL_RE.test(value)) {
    const decoded = decodeFileUrl(value);
    if (!decoded) return null;
    value = decoded;
  }

  value = stripWorkspacePrefix(normalizePath(value));
  if (!value || value === "." || value === "..") return null;

  if (!options?.allowBareName && !/[/.]/.test(value)) {
    return null;
  }

  return value;
};

const toolCategory = (toolName: string): FileLedgerCategory | null => {
  const lower = toolName.toLowerCase();
  if (lower === "apply_patch" || /write|edit|patch|create|update|replace/.test(lower)) return "output";
  if (/read|list|grep|glob|search|find|cat/.test(lower)) return "reference";
  return null;
};

const pushIfString = (out: string[], value: unknown) => {
  if (typeof value === "string" && value.trim()) {
    out.push(value.trim());
  }
};

const extractToolPathCandidates = (record: Record<string, unknown>) => {
  const state = toRecord(record.state);
  const input = toRecord(state.input);
  const values: string[] = [];

  pushIfString(values, state.path);
  pushIfString(values, state.file);
  pushIfString(values, input.path);
  pushIfString(values, input.file);
  pushIfString(values, input.filePath);
  pushIfString(values, input.target);
  pushIfString(values, input.cwd);

  if (Array.isArray(state.files)) {
    for (const entry of state.files) {
      pushIfString(values, entry);
    }
  }

  if (Array.isArray(input.files)) {
    for (const entry of input.files) {
      pushIfString(values, entry);
    }
  }

  if (Array.isArray(input.targets)) {
    for (const entry of input.targets) {
      pushIfString(values, entry);
    }
  }

  const title = typeof state.title === "string" ? state.title : "";
  const output = typeof state.output === "string" ? state.output.slice(0, 4000) : "";
  const text = [title, output].filter(Boolean).join(" ");
  if (text) {
    PATH_PATTERN.lastIndex = 0;
    for (const match of text.matchAll(PATH_PATTERN)) {
      if (match[1]) values.push(match[1]);
    }
  }

  return values;
};

export function deriveFileLedger(
  messages: MessageWithParts[],
  options: DeriveFileLedgerOptions = {},
): FileLedger {
  const maxMessages =
    typeof options.maxMessages === "number" && Number.isFinite(options.maxMessages) && options.maxMessages > 0
      ? Math.floor(options.maxMessages)
      : null;
  const source = maxMessages && messages.length > maxMessages ? messages.slice(messages.length - maxMessages) : messages;

  const ledger = new Map<string, FileLedgerItem>();
  let sequence = 0;
  let unnamedUploadCount = 0;

  const record = (
    rawPath: string,
    category: FileLedgerCategory,
    sourceType: FileLedgerSource,
    messageId?: string,
    options?: { allowBareName?: boolean },
  ) => {
    const cleanedPath = cleanPathCandidate(rawPath, options);
    if (!cleanedPath) return;
    const key = cleanedPath.toLowerCase();
    sequence += 1;

    const existing = ledger.get(key);
    if (existing) {
      existing.lastSeenAt = sequence;
      if (!existing.messageId && messageId) existing.messageId = messageId;
      return;
    }

    ledger.set(key, {
      id: `ledger-${encodeURIComponent(cleanedPath)}`,
      path: cleanedPath,
      name: basename(cleanedPath),
      category,
      source: sourceType,
      firstSeenAt: sequence,
      lastSeenAt: sequence,
      messageId,
    });
  };

  for (const message of source) {
    const messageIdRaw = (message.info as { id?: unknown })?.id;
    const messageId = typeof messageIdRaw === "string" && messageIdRaw.trim() ? messageIdRaw.trim() : undefined;

    for (const part of message.parts ?? []) {
      if (part.type === "file") {
        const filePart = part as Record<string, unknown>;
        const url = typeof filePart.url === "string" ? filePart.url.trim() : "";
        const filename = typeof filePart.filename === "string" ? filePart.filename.trim() : "";
        const fallbackPath = typeof filePart.path === "string" ? filePart.path : "";

        if (FILE_URL_RE.test(url)) {
          record(url, "input", "mention", messageId);
          continue;
        }
        if (DATA_URL_RE.test(url)) {
          const uploadName = filename || `upload-${++unnamedUploadCount}`;
          record(uploadName, "input", "upload", messageId, { allowBareName: true });
          continue;
        }
        if (fallbackPath) {
          record(fallbackPath, "input", "mention", messageId);
        }
        continue;
      }

      if (part.type !== "tool") continue;
      const toolPart = part as Record<string, unknown>;
      const toolName = typeof toolPart.tool === "string" ? toolPart.tool.trim() : "";
      if (!toolName) continue;
      const category = toolCategory(toolName);
      if (!category) continue;

      const matches = extractToolPathCandidates(toolPart);
      for (const match of matches) {
        record(match, category, "tool", messageId);
      }
    }
  }

  const all = Array.from(ledger.values()).sort((a, b) => b.lastSeenAt - a.lastSeenAt);
  return {
    all,
    input: all.filter((item) => item.category === "input"),
    reference: all.filter((item) => item.category === "reference"),
    output: all.filter((item) => item.category === "output"),
  };
}
