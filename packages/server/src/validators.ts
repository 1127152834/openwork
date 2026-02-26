import { apiError } from "./errors.js";
import { tr } from "./i18n.js";

const SKILL_NAME_REGEX = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const COMMAND_NAME_REGEX = /^[A-Za-z0-9_-]+$/;
const MCP_NAME_REGEX = /^[A-Za-z0-9_-]+$/;

export function validateSkillName(name: string): void {
  if (!name || name.length < 1 || name.length > 64 || !SKILL_NAME_REGEX.test(name)) {
    throw apiError(400, "invalid_skill_name", tr("skill_name_kebab_case"));
  }
}

export function validateDescription(description: string | undefined): void {
  if (!description || description.length < 1 || description.length > 1024) {
    throw apiError(422, "invalid_description", tr("description_length_invalid"));
  }
}

export function validatePluginSpec(spec: string): void {
  if (!spec || spec.trim().length === 0) {
    throw apiError(400, "invalid_plugin_spec", tr("plugin_spec_required"));
  }
}

export function sanitizeCommandName(name: string): string {
  const trimmed = name.trim().replace(/^\/+/, "");
  return trimmed;
}

export function validateCommandName(name: string): void {
  if (!name || !COMMAND_NAME_REGEX.test(name)) {
    throw apiError(400, "invalid_command_name", tr("command_name_alnum"));
  }
}

export function validateMcpName(name: string): void {
  if (!name || name.startsWith("-") || !MCP_NAME_REGEX.test(name)) {
    throw apiError(400, "invalid_mcp_name", tr("mcp_name_invalid"));
  }
}

export function validateMcpConfig(config: Record<string, unknown>): void {
  const type = config.type;
  if (type !== "local" && type !== "remote") {
    throw apiError(400, "invalid_mcp_config", tr("mcp_config_type_invalid"));
  }
  if (type === "local") {
    const command = config.command;
    if (!Array.isArray(command) || command.length === 0) {
      throw apiError(400, "invalid_mcp_config", tr("mcp_local_command_required"));
    }
  }
  if (type === "remote") {
    const url = config.url;
    if (!url || typeof url !== "string") {
      throw apiError(400, "invalid_mcp_config", tr("mcp_remote_url_required"));
    }
  }
}
