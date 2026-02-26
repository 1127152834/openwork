import { AsyncLocalStorage } from "node:async_hooks";

export type ServerLocale = "en" | "zh";

type TemplateVars = Record<string, string | number | boolean>;

const localeStore = new AsyncLocalStorage<ServerLocale>();

const SERVER_MESSAGES = {
  en: {
    agentlab_parse_failed: "Failed to parse Agent Lab automations",
    approval_not_found: "Approval request not found",
    artifact_id_invalid: "Artifact id is invalid",
    artifact_id_required: "Artifact id is required",
    artifact_not_found: "Artifact not found",
    automation_id_pattern_invalid: "automation id must match /^[a-zA-Z0-9_-]+$/",
    automation_id_required: "automation id is required",
    automation_id_too_long: "automation id is too long",
    automation_not_found: "Automation not found",
    channel_must_be_telegram_or_slack: "channel must be 'telegram' or 'slack'",
    command_name_alnum: "Command name must be alphanumeric with _ or -",
    command_name_required: "Command name is required",
    command_template_required: "Command template is required",
    content_must_be_string: "content must be a string",
    description_length_invalid: "Description must be 1-1024 characters",
    directory_required_when_no_peer: "directory is required when peerId is not provided",
    engine_reload_deprecated: "OpenWork-managed engine reload is disabled",
    expected_multipart_form_data: "Expected multipart/form-data",
    field_must_be_between: "{name} must be between {min} and {max}",
    field_must_be_number: "{name} must be a number",
    file_changed_since_loaded: "File changed since it was loaded",
    file_exceeds_size_limit: "File exceeds size limit",
    file_exceeds_upload_limit: "File exceeds upload limit",
    file_not_found: "File not found",
    form_file_required: "Form field 'file' is required",
    home_dir_resolve_failed: "Failed to resolve home directory",
    hub_fetch_data_failed: "Failed to fetch hub data ({status}): {detail}",
    hub_fetch_file_failed: "Failed to fetch hub file ({status}): {detail}",
    hub_install_missing_skill_md: "Hub skill install failed (missing SKILL.md): {name}",
    hub_skill_not_found_named: "Hub skill not found: {name}",
    identity_env_reserved: "Identity id 'env' is reserved",
    identity_scoped_to_workspace: "Identity id is scoped to this workspace ({workspaceId}).",
    inbox_item_id_invalid: "Inbox item id is invalid",
    inbox_item_not_found: "Inbox item not found",
    insufficient_token_scope: "Insufficient token scope",
    invalid_bearer_token: "Invalid bearer token",
    invalid_host_token: "Invalid host token",
    invalid_json_body: "Invalid JSON body",
    log_not_found: "Log not found",
    markdown_only_supported: "Only markdown files are supported",
    mcp_config_type_invalid: "MCP config type must be local or remote",
    mcp_config_required: "MCP config is required",
    mcp_local_command_required: "Local MCP requires command array",
    mcp_name_invalid: "MCP name must be alphanumeric and not start with -",
    mcp_remote_url_required: "Remote MCP requires url",
    missing_token_scope: "Missing token scope",
    name_required: "name is required",
    not_found: "Not found",
    only_owner_can_reply_permissions: "Only owner tokens can reply to permission requests",
    opencode_base_url_invalid: "OpenCode base URL is invalid",
    opencode_base_url_missing: "OpenCode base URL is missing for this workspace",
    opencode_or_openwork_required: "opencode or openwork updates required",
    opencode_reload_failed: "OpenCode reload failed",
    opencode_request_failed: "OpenCode request failed",
    opencode_router_binding_not_applied: "OpenCodeRouter did not apply binding update",
    opencode_router_config_parse_failed: "Failed to parse opencode-router.json",
    opencode_router_config_read_failed: "Failed to read opencode-router.json",
    opencode_router_health_unavailable: "OpenCodeRouter health server is unavailable",
    opencode_router_send_failed: "OpenCodeRouter did not send the message",
    opencode_router_unconfigured: "OpenCodeRouter is not configured on this host",
    opencode_router_unreachable: "OpenCodeRouter is not reachable on this host",
    opencode_router_update_not_applied: "OpenCodeRouter did not apply the update",
    opencode_session_id_missing: "OpenCode session did not return an id",
    openwork_json_parse_failed: "Failed to parse openwork.json",
    pairing_code_generation_failed: "Failed to generate Telegram pairing code",
    pairing_code_invalid: "Pairing code must be 6-24 letters or numbers",
    path_escapes_workspace_root: "Path escapes workspace root",
    path_contains_null_byte: "Path contains null byte",
    path_must_be_absolute: "Path must be absolute",
    path_must_be_file: "Path must point to a file",
    path_required: "Path is required",
    path_traversal_not_allowed: "Path traversal is not allowed",
    peer_id_required: "peerId is required",
    prompt_required: "prompt is required",
    schedule_kind_invalid: "schedule.kind must be interval, daily, or weekly",
    schedule_required: "schedule is required",
    scheduler_job_not_found_named: "Job \"{name}\" not found.",
    scheduler_supported_only_darwin_linux: "Scheduler is supported only on macOS and Linux.",
    server_config_parse_failed: "Failed to parse server config",
    server_config_read_failed: "Failed to read server config",
    server_read_only: "Server is read-only",
    session_id_required: "sessionId is required",
    skill_content_required: "Skill content is required",
    skill_frontmatter_name_mismatch: "Skill frontmatter name must match payload name",
    skill_name_kebab_case: "Skill name must be kebab-case (1-64 chars)",
    skill_name_required: "Skill name is required",
    skill_not_found_named: "Skill not found: {name}",
    slack_tokens_required: "Slack botToken and appToken are required",
    subdirectories_not_allowed: "Subdirectories are not allowed",
    telegram_pairing_code_hash_required: "Telegram private access requires a pairing code hash",
    telegram_token_required: "Telegram token is required",
    text_required: "text is required",
    token_not_found: "Token not found",
    token_scope_invalid: "Token scope must be owner, collaborator, or viewer",
    toy_ui_disabled: "Toy UI is disabled",
    unexpected_server_error: "Unexpected server error",
    invalid_file_path: "Invalid file path",
    jsonc_parse_failed: "Failed to parse JSONC",
    plugin_spec_required: "Plugin spec is required",
    viewer_tokens_read_only: "Viewer tokens are read-only",
    workspace_inbox_disabled: "Workspace inbox is disabled",
    workspace_not_found: "Workspace not found",
    workspace_outbox_disabled: "Workspace outbox is disabled",
    workspace_unauthorized: "Workspace is not authorized",
    write_request_denied: "Write request denied",
  },
  zh: {
    agentlab_parse_failed: "解析 Agent Lab 自动化配置失败",
    approval_not_found: "未找到审批请求",
    artifact_id_invalid: "工件 ID 无效",
    artifact_id_required: "缺少工件 ID",
    artifact_not_found: "未找到工件",
    automation_id_pattern_invalid: "automation id 必须匹配 /^[a-zA-Z0-9_-]+$/",
    automation_id_required: "automation id 不能为空",
    automation_id_too_long: "automation id 过长",
    automation_not_found: "未找到自动化任务",
    channel_must_be_telegram_or_slack: "channel 必须是 'telegram' 或 'slack'",
    command_name_alnum: "命令名称必须为字母数字并可包含 _ 或 -",
    command_name_required: "命令名称不能为空",
    command_template_required: "命令模板不能为空",
    content_must_be_string: "content 必须是字符串",
    description_length_invalid: "描述长度必须为 1-1024 个字符",
    directory_required_when_no_peer: "未提供 peerId 时必须提供 directory",
    engine_reload_deprecated: "OpenWork 托管的引擎重载已禁用",
    expected_multipart_form_data: "需要 multipart/form-data",
    field_must_be_between: "{name} 必须在 {min} 到 {max} 之间",
    field_must_be_number: "{name} 必须是数字",
    file_changed_since_loaded: "文件自加载后已变更",
    file_exceeds_size_limit: "文件超过大小限制",
    file_exceeds_upload_limit: "文件超过上传限制",
    file_not_found: "未找到文件",
    form_file_required: "必须提供表单字段 'file'",
    home_dir_resolve_failed: "解析 home 目录失败",
    hub_fetch_data_failed: "获取 Hub 数据失败（{status}）：{detail}",
    hub_fetch_file_failed: "获取 Hub 文件失败（{status}）：{detail}",
    hub_install_missing_skill_md: "安装 Hub 技能失败（缺少 SKILL.md）：{name}",
    hub_skill_not_found_named: "未找到 Hub 技能：{name}",
    identity_env_reserved: "Identity id 'env' 为保留值",
    identity_scoped_to_workspace: "Identity id 仅限当前工作区（{workspaceId}）",
    inbox_item_id_invalid: "收件箱条目 ID 无效",
    inbox_item_not_found: "未找到收件箱条目",
    insufficient_token_scope: "Token 权限范围不足",
    invalid_bearer_token: "Bearer token 无效",
    invalid_host_token: "Host token 无效",
    invalid_json_body: "JSON 请求体无效",
    log_not_found: "未找到日志",
    markdown_only_supported: "仅支持 Markdown 文件",
    mcp_config_type_invalid: "MCP 配置类型必须是 local 或 remote",
    mcp_config_required: "MCP 配置不能为空",
    mcp_local_command_required: "Local MCP 需要 command 数组",
    mcp_name_invalid: "MCP 名称必须为字母数字且不能以 - 开头",
    mcp_remote_url_required: "Remote MCP 需要 url",
    missing_token_scope: "缺少 token scope",
    name_required: "name 不能为空",
    not_found: "未找到",
    only_owner_can_reply_permissions: "仅 owner token 可以回复权限请求",
    opencode_base_url_invalid: "OpenCode base URL 无效",
    opencode_base_url_missing: "此工作区缺少 OpenCode base URL",
    opencode_or_openwork_required: "必须提供 opencode 或 openwork 更新",
    opencode_reload_failed: "OpenCode 重载失败",
    opencode_request_failed: "OpenCode 请求失败",
    opencode_router_binding_not_applied: "OpenCodeRouter 未应用绑定更新",
    opencode_router_config_parse_failed: "解析 opencode-router.json 失败",
    opencode_router_config_read_failed: "读取 opencode-router.json 失败",
    opencode_router_health_unavailable: "OpenCodeRouter 健康服务不可用",
    opencode_router_send_failed: "OpenCodeRouter 未发送消息",
    opencode_router_unconfigured: "此主机未配置 OpenCodeRouter",
    opencode_router_unreachable: "无法连接到此主机上的 OpenCodeRouter",
    opencode_router_update_not_applied: "OpenCodeRouter 未应用更新",
    opencode_session_id_missing: "OpenCode 会话未返回 id",
    openwork_json_parse_failed: "解析 openwork.json 失败",
    pairing_code_generation_failed: "生成 Telegram 配对码失败",
    pairing_code_invalid: "配对码必须为 6-24 位字母或数字",
    path_escapes_workspace_root: "路径越过了工作区根目录",
    path_contains_null_byte: "路径包含空字节",
    path_must_be_absolute: "路径必须是绝对路径",
    path_must_be_file: "路径必须指向文件",
    path_required: "路径不能为空",
    path_traversal_not_allowed: "不允许路径穿越",
    peer_id_required: "peerId 不能为空",
    prompt_required: "prompt 不能为空",
    schedule_kind_invalid: "schedule.kind 必须是 interval、daily 或 weekly",
    schedule_required: "缺少 schedule",
    scheduler_job_not_found_named: "未找到任务 \"{name}\"。",
    scheduler_supported_only_darwin_linux: "调度器仅支持 macOS 和 Linux。",
    server_config_parse_failed: "解析 server 配置失败",
    server_config_read_failed: "读取 server 配置失败",
    server_read_only: "服务器为只读模式",
    session_id_required: "sessionId 不能为空",
    skill_content_required: "技能内容不能为空",
    skill_frontmatter_name_mismatch: "技能 frontmatter 的 name 必须与 payload name 一致",
    skill_name_kebab_case: "技能名称必须是 kebab-case（1-64 字符）",
    skill_name_required: "技能名称不能为空",
    skill_not_found_named: "未找到技能：{name}",
    slack_tokens_required: "Slack botToken 和 appToken 不能为空",
    subdirectories_not_allowed: "不允许子目录",
    telegram_pairing_code_hash_required: "Telegram 私有访问需要 pairing code hash",
    telegram_token_required: "Telegram token 不能为空",
    text_required: "text 不能为空",
    token_not_found: "未找到 token",
    token_scope_invalid: "Token scope 必须是 owner、collaborator 或 viewer",
    toy_ui_disabled: "Toy UI 已禁用",
    unexpected_server_error: "服务器发生意外错误",
    invalid_file_path: "文件路径无效",
    jsonc_parse_failed: "解析 JSONC 失败",
    plugin_spec_required: "Plugin spec 不能为空",
    viewer_tokens_read_only: "Viewer token 为只读",
    workspace_inbox_disabled: "工作区收件箱已禁用",
    workspace_not_found: "未找到工作区",
    workspace_outbox_disabled: "工作区发件箱已禁用",
    workspace_unauthorized: "工作区未授权",
    write_request_denied: "写入请求被拒绝",
  },
} as const;

export type ServerTextKey = keyof (typeof SERVER_MESSAGES)["en"];

function normalizeLocale(value: string | null | undefined): ServerLocale | null {
  const normalized = (value ?? "").trim().toLowerCase();
  if (!normalized) return null;
  if (normalized.startsWith("zh")) return "zh";
  if (normalized.startsWith("en")) return "en";
  return null;
}

function resolveLocaleFromAcceptLanguage(raw: string | null): ServerLocale | null {
  if (!raw) return null;
  const segments = raw.split(",");
  for (const segment of segments) {
    const langToken = segment.split(";")[0]?.trim() ?? "";
    const locale = normalizeLocale(langToken);
    if (locale) return locale;
  }
  return null;
}

function currentLocale(): ServerLocale {
  return localeStore.getStore() ?? normalizeLocale(process.env.OPENWORK_LANG) ?? "en";
}

export function resolveServerLocale(request: Request): ServerLocale {
  return resolveLocaleFromAcceptLanguage(request.headers.get("accept-language"))
    ?? normalizeLocale(process.env.OPENWORK_LANG)
    ?? "en";
}

export function withServerLocale<T>(locale: ServerLocale, run: () => T): T {
  return localeStore.run(locale, run);
}

export function tr(key: ServerTextKey, vars?: TemplateVars): string {
  const locale = currentLocale();
  const template = SERVER_MESSAGES[locale][key] ?? SERVER_MESSAGES.en[key] ?? key;
  if (!vars) return template;
  return template.replace(/\{([A-Za-z0-9_]+)\}/g, (_, name: string) => {
    if (!(name in vars)) return `{${name}}`;
    return String(vars[name]);
  });
}
