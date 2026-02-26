import { For, Show, createEffect, createMemo, createSignal } from "solid-js";
import { Paperclip } from "lucide-solid";
import { t, currentLocale } from "../../../i18n";
import type { FileLedgerCategory, FileLedgerItem } from "../../utils/file-ledger";

export type ArtifactsPanelProps = {
  items: FileLedgerItem[];
  workspaceRoot?: string;
  onOpenMarkdown?: (path: string) => void;
  onOpenImage?: (path: string) => void;
  maxPreview?: number;
  id?: string;
};

const normalizePath = (value: string) => value.trim().replace(/[\\/]+/g, "/");
const splitPathSegments = (value: string) => value.split(/[/\\]/).filter(Boolean);

const toWorkspaceRelative = (file: string, root?: string) => {
  const normalizedRoot = (root ?? "").trim().replace(/[\\/]+/g, "/").replace(/\/+$/, "");
  if (!normalizedRoot) return file;

  const normalizedFile = file.replace(/[\\/]+/g, "/");
  const rootKey = normalizedRoot.toLowerCase();
  const fileKey = normalizedFile.toLowerCase();

  if (fileKey === rootKey) return normalizedFile.split("/").pop() ?? normalizedFile;
  if (fileKey.startsWith(`${rootKey}/`)) return normalizedFile.slice(normalizedRoot.length + 1);
  return normalizedFile;
};

const getBasename = (value: string) => {
  const segments = splitPathSegments(value);
  return segments[segments.length - 1] ?? value;
};

const getDirname = (value: string) => {
  const segments = splitPathSegments(value);
  if (segments.length <= 1) return "";
  return segments.slice(0, -1).join("/");
};

const isMarkdown = (value: string) => /\.(md|mdx|markdown)$/i.test(value);
const isImage = (value: string) => /\.(png|jpe?g|gif|webp|svg)$/i.test(value);

type ArtifactKind = "markdown" | "image" | "file";
type ArtifactTab = "all" | "input" | "reference" | "output";

const artifactKind = (value: string): ArtifactKind => {
  if (isMarkdown(value)) return "markdown";
  if (isImage(value)) return "image";
  return "file";
};

export default function ArtifactsPanel(props: ArtifactsPanelProps) {
  const translate = (key: string) => t(key, currentLocale());
  const [showAll, setShowAll] = createSignal(false);
  const [activeTab, setActiveTab] = createSignal<ArtifactTab>("all");
  const maxPreview = createMemo(() => {
    const raw = props.maxPreview ?? 6;
    if (!Number.isFinite(raw)) return 6;
    return Math.min(12, Math.max(3, Math.floor(raw)));
  });

  createEffect(() => {
    activeTab();
    setShowAll(false);
  });

  const normalizedArtifacts = createMemo(() => {
    const out: Array<{ path: string; kind: ArtifactKind; category: FileLedgerCategory }> = [];
    const seen = new Set<string>();

    for (const item of props.items ?? []) {
      const normalized = normalizePath(String(item?.path ?? ""));
      if (!normalized) continue;
      const base = getBasename(normalized);
      const kind = artifactKind(base);
      const category = item?.category ?? "output";

      const key = normalized.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({ path: normalized, kind, category });
      if (out.length >= 96) break;
    }

    return out;
  });

  const tabCounts = createMemo(() => {
    const all = normalizedArtifacts();
    return {
      all: all.length,
      input: all.filter((item) => item.category === "input").length,
      reference: all.filter((item) => item.category === "reference").length,
      output: all.filter((item) => item.category === "output").length,
    };
  });

  const filteredArtifacts = createMemo(() => {
    const list = normalizedArtifacts();
    const tab = activeTab();
    if (tab === "all") return list;
    return list.filter((item) => item.category === tab);
  });

  const visibleArtifacts = createMemo(() => {
    const list = filteredArtifacts();
    return showAll() ? list : list.slice(0, maxPreview());
  });

  const hiddenCount = createMemo(() => {
    const total = filteredArtifacts().length;
    const shown = visibleArtifacts().length;
    return Math.max(0, total - shown);
  });

  const canOpenMarkdown = createMemo(() => typeof props.onOpenMarkdown === "function");
  const canOpenImage = createMemo(() => typeof props.onOpenImage === "function");
  const prettyPath = (file: string) => toWorkspaceRelative(file, props.workspaceRoot);
  const tabList: Array<{ id: ArtifactTab; labelKey: string }> = [
    { id: "all", labelKey: "artifacts_panel.tab_all" },
    { id: "input", labelKey: "artifacts_panel.tab_input" },
    { id: "output", labelKey: "artifacts_panel.tab_output" },
    { id: "reference", labelKey: "artifacts_panel.tab_reference" },
  ];
  const categoryLabelKey = (category: FileLedgerCategory) => {
    if (category === "input") return "artifacts_panel.tab_input";
    if (category === "reference") return "artifacts_panel.tab_reference";
    return "artifacts_panel.tab_output";
  };

  return (
    <div id={props.id} class="rounded-xl border border-dls-border bg-dls-hover px-3 py-2.5">
      <div class="flex items-center justify-between gap-3">
        <div class="flex items-center gap-2 min-w-0">
          <Paperclip size={14} class="text-dls-secondary" />
          <div class="min-w-0">
            <div class="text-[11px] font-bold tracking-tight text-dls-secondary uppercase">
              {translate("session.artifacts")}
            </div>
          </div>
        </div>
        <Show when={normalizedArtifacts().length > 0}>
          <div class="text-[11px] text-dls-secondary font-mono">{normalizedArtifacts().length}</div>
        </Show>
      </div>

      <div class="mt-2 flex items-center gap-1 overflow-x-auto pb-1">
        <For each={tabList}>
          {(tab) => {
            const selected = () => activeTab() === tab.id;
            const count = () => tabCounts()[tab.id];
            return (
              <button
                type="button"
                class={`shrink-0 rounded-md border px-2 py-1 text-[10px] font-medium transition-colors ${
                  selected()
                    ? "border-dls-border bg-dls-active text-dls-text"
                    : "border-transparent text-dls-secondary hover:border-dls-border hover:bg-dls-surface hover:text-dls-text"
                }`}
                onClick={() => setActiveTab(tab.id)}
              >
                {translate(tab.labelKey)} ({count()})
              </button>
            );
          }}
        </For>
      </div>

      <div class="mt-2 space-y-1.5">
        <Show
          when={visibleArtifacts().length > 0}
          fallback={<div class="text-xs text-dls-secondary px-1 py-1">{translate("session.no_artifacts")}</div>}
        >
          <For each={visibleArtifacts()}>
            {(artifact) => {
              const display = () => prettyPath(artifact.path);
              const base = () => getBasename(display());
              const dir = () => getDirname(display());
              const md = () => artifact.kind === "markdown";
              const img = () => artifact.kind === "image";
              const generic = () => artifact.kind === "file";
              const openable = () => (md() ? canOpenMarkdown() : img() ? canOpenImage() : false);
              const tooltip = () => {
                if (md()) return display();
                if (img() && !canOpenImage()) {
                  return `${display()} (${translate("artifacts_panel.image_preview_coming_soon")})`;
                }
                return display();
              };
              return (
                <button
                  type="button"
                  class={`w-full rounded-xl border border-dls-border/70 bg-dls-surface/70 px-2.5 py-2 text-left transition-colors ${
                    openable() ? "hover:bg-dls-active/80 hover:border-dls-border" : "cursor-default"
                  }`}
                  onClick={() => {
                    if (md()) props.onOpenMarkdown?.(artifact.path);
                    else if (img()) props.onOpenImage?.(artifact.path);
                  }}
                  disabled={!openable()}
                  title={tooltip()}
                  aria-label={
                    openable()
                      ? translate("artifacts_panel.open_file").replace("{path}", display())
                      : tooltip()
                  }
                >
                  <div class="min-w-0">
                    <div class="truncate text-xs font-semibold text-dls-text leading-5">{base()}</div>
                    <Show when={dir()}>
                      <div class="truncate text-[11px] text-dls-secondary leading-4">{dir()}</div>
                    </Show>
                  </div>
                  <div class="mt-1.5 flex flex-wrap items-center gap-1">
                    <Show when={md()}>
                      <span class="shrink-0 rounded-md border border-dls-border bg-dls-surface px-1.5 py-0.5 text-[10px] font-mono text-dls-secondary">
                        MD
                      </span>
                    </Show>
                    <Show when={img()}>
                      <span class="shrink-0 rounded-md border border-dls-border bg-dls-surface px-1.5 py-0.5 text-[10px] font-mono text-dls-secondary">
                        IMG
                      </span>
                    </Show>
                    <Show when={generic()}>
                      <span class="shrink-0 rounded-md border border-dls-border bg-dls-surface px-1.5 py-0.5 text-[10px] font-mono text-dls-secondary">
                        {translate("artifacts_panel.file_kind")}
                      </span>
                    </Show>
                    <Show when={activeTab() === "all"}>
                      <span class="shrink-0 rounded-md border border-dls-border bg-dls-surface px-1.5 py-0.5 text-[10px] text-dls-secondary">
                        {translate(categoryLabelKey(artifact.category))}
                      </span>
                    </Show>
                  </div>
                </button>
              );
            }}
          </For>
        </Show>

        <Show when={hiddenCount() > 0}>
          <button
            type="button"
            class="w-full mt-1 rounded-lg px-2 py-1.5 text-xs text-dls-secondary hover:text-dls-text hover:bg-dls-active transition-colors"
            onClick={() => setShowAll((prev) => !prev)}
          >
            {showAll()
              ? translate("artifacts_panel.show_fewer")
              : translate("artifacts_panel.show_more").replace("{count}", String(hiddenCount()))}
          </button>
        </Show>
      </div>
    </div>
  );
}
