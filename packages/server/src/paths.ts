import { realpath } from "node:fs/promises";
import { isAbsolute, resolve, sep } from "node:path";
import { apiError } from "./errors.js";
import { tr } from "./i18n.js";

export function assertAbsolute(path: string): void {
  if (!isAbsolute(path)) {
    throw apiError(400, "invalid_path", tr("path_must_be_absolute"));
  }
}

export async function resolveWithinRoot(root: string, ...segments: string[]): Promise<string> {
  const resolvedRoot = await realpath(root);
  const candidate = resolve(resolvedRoot, ...segments);
  const resolvedCandidate = await realpath(candidate).catch(() => candidate);
  if (resolvedCandidate === resolvedRoot) return candidate;
  if (!resolvedCandidate.startsWith(resolvedRoot + sep)) {
    throw apiError(400, "path_escape", tr("path_escapes_workspace_root"));
  }
  return candidate;
}
