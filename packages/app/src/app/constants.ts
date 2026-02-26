import type { ModelRef, SuggestedPlugin } from "./types";

export const MODEL_PREF_KEY = "openwork.defaultModel";
export const SESSION_MODEL_PREF_KEY = "openwork.sessionModels";
export const THINKING_PREF_KEY = "openwork.showThinking";
export const VARIANT_PREF_KEY = "openwork.modelVariant";
export const LANGUAGE_PREF_KEY = "openwork.language";
export const HIDE_TITLEBAR_PREF_KEY = "openwork.hideTitlebar";

export const DEFAULT_MODEL: ModelRef = {
  providerID: "opencode",
  modelID: "big-pickle",
};

export const SUGGESTED_PLUGINS: SuggestedPlugin[] = [
  {
    name: "opencode-scheduler",
    packageName: "opencode-scheduler",
    description: "constants.suggested_plugins.scheduler_description",
    tags: ["automation", "jobs"],
    installMode: "simple",
  },
];

export type McpDirectoryInfo = {
  name: string;
  description: string;
  url?: string;
  type?: "remote" | "local";
  command?: string[];
  oauth: boolean;
};

export const MCP_QUICK_CONNECT: McpDirectoryInfo[] = [
  {
    name: "Notion",
    description: "constants.mcp_quick_connect.notion_description",
    url: "https://mcp.notion.com/mcp",
    type: "remote",
    oauth: true,
  },
  {
    name: "Linear",
    description: "constants.mcp_quick_connect.linear_description",
    url: "https://mcp.linear.app/mcp",
    type: "remote",
    oauth: true,
  },
  {
    name: "Sentry",
    description: "constants.mcp_quick_connect.sentry_description",
    url: "https://mcp.sentry.dev/mcp",
    type: "remote",
    oauth: true,
  },
  {
    name: "Stripe",
    description: "constants.mcp_quick_connect.stripe_description",
    url: "https://mcp.stripe.com",
    type: "remote",
    oauth: true,
  },
  {
    name: "HubSpot",
    description: "constants.mcp_quick_connect.hubspot_description",
    url: "https://mcp.hubspot.com/anthropic",
    type: "remote",
    oauth: true,
  },
  {
    name: "Context7",
    description: "constants.mcp_quick_connect.context7_description",
    url: "https://mcp.context7.com/mcp",
    type: "remote",
    oauth: false,
  },
  {
    name: "Control Chrome",
    description: "constants.mcp_quick_connect.control_chrome_description",
    type: "local",
    command: ["chrome-devtools-mcp"],
    oauth: false,
  },
];
