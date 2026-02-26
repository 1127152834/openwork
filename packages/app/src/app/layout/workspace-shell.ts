export const WORKSPACE_ROOT_CLASS =
  "flex h-screen w-full bg-[linear-gradient(180deg,rgba(248,250,252,0.92),rgba(241,245,249,0.95))] text-dls-text font-sans overflow-hidden p-3";

export const WORKSPACE_MAIN_CLASS = "flex-1 min-w-0 flex flex-col overflow-hidden";

export const WORKSPACE_TOPBAR_CLASS = "h-14 mb-2 flex items-center justify-between px-2 z-10 shrink-0";

export const WORKSPACE_CENTER_SURFACE_CLASS =
  "flex-1 min-h-0 flex flex-col overflow-hidden rounded-[24px] border border-dls-border/80 bg-dls-surface/96";

export const WORKSPACE_DRAWER_SURFACE_CLASS =
  "h-full rounded-[20px] border border-dls-border/90 bg-dls-sidebar/95 backdrop-blur-xl";

export const WORKSPACE_PANEL_SURFACE_CLASS =
  "h-full rounded-[20px] border border-dls-border/90 bg-dls-surface/96 backdrop-blur-md";

export const WORKSPACE_LEFT_DRAWER_WIDTH_CLASS = "w-[210px] max-w-[76vw]";

export const WORKSPACE_RIGHT_DRAWER_WIDTH_CLASS = "w-[300px] max-w-[84vw]";

export const drawerRailClass = (
  open: boolean,
  side: "left" | "right",
  widthClass: string,
) =>
  [
    "shrink-0 min-h-0 overflow-hidden transition-[width,margin,opacity,transform] duration-[340ms] ease-[cubic-bezier(0.22,1,0.36,1)]",
    open ? widthClass : "w-0 pointer-events-none",
    open ? "opacity-100" : "opacity-0",
    side === "left" ? (open ? "mr-3 translate-x-0" : "mr-0 -translate-x-3") : "",
    side === "right" ? (open ? "ml-3 translate-x-0" : "ml-0 translate-x-3") : "",
  ]
    .filter(Boolean)
    .join(" ");
