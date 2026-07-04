// src/types/mindmap.ts
// Port 1:1 từ mục 3.2 của spec (MindMapBDS_AppSpec.docx)

export type ArrowHeadType =
  | "none" | "arrow" | "filled-arrow" | "open-arrow" | "stop"
  | "open-circle" | "filled-circle" | "open-diamond" | "filled-diamond";

export type LineDashId =
  | "solid" | "thin-solid" | "dashed-thin" | "cable" | "wide-dash"
  | "double" | "dashed-double" | "tapered" | "reverse-tapered" | "auto-tapered";

export const TAPER_DASH_IDS: ReadonlySet<LineDashId> = new Set([
  "tapered",
  "reverse-tapered",
  "auto-tapered",
]);

export type ConnectorShape = "orthogonal" | "curved" | "orthogonal-round" | "straight";

export interface RelationStyle {
  shape: ConnectorShape;
  dashId: LineDashId;
  width: number | null;
  arrowStart: ArrowHeadType;
  arrowEnd: ArrowHeadType;
  color: string | null;
}

// Default chỉ dùng để TÍNH TOÁN hiển thị (effective style), KHÔNG BAO GIỜ
// được spread/lưu thẳng vào relStyle persisted. Xem mục 3.3.1 spec và
// src/utils/relStyle.ts để hiểu lý do (bài học xương máu từ bản web).
export const DEFAULT_RELATION_STYLE: RelationStyle = {
  shape: "curved",
  dashId: "solid",
  width: null,
  arrowStart: "none",
  arrowEnd: "none", // KHÔNG đặt "arrow" ở đây — xem ghi chú trong userMemories/spec
  color: null,
};

export interface MindMapNode {
  id: string;
  mapId: string;
  parentId: string | null;
  title: string;
  x: number;
  y: number;
  w: number | null;
  h: number | null;
  color: string;
  icon: string | null;
  collapsed: boolean;
  relStyle: Partial<RelationStyle> | null;
  sortOrder: number;
}

export interface CrossLink {
  id: string;
  mapId: string;
  fromId: string;
  toId: string;
  label: string | null;
  color: string | null;
  cpx: number | null;
  cpy: number | null;
  relStyle: Partial<RelationStyle> | null;
}

export type LayoutType =
  | "free" | "horizontal" | "vertical" | "list"
  | "topdown" | "linear" | "radial" | "matrix";

export interface MindMapDoc {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  layoutType: LayoutType;
  pwdHash: string | null;
  nodes: MindMapNode[];
  crossLinks: CrossLink[];
}

export interface MindMapTemplate {
  id: string;
  title: string;
  category: string | null;
  dataJson: string; // serialized MindMapDoc (partial: nodes + crossLinks)
}

export interface ColorPaletteEntry {
  id: string;
  bg: string;
  border: string;
  text: string;
}

// Mục 11 spec — bảng màu cố định kế thừa từ bản web.
// LƯU Ý: đây mới là tập rút gọn nêu trong spec; khi triển khai thật cần lấy
// đầy đủ từ mảng COLORS trong index.html bản web để đồng bộ 100%.
export const COLOR_PALETTE: ColorPaletteEntry[] = [
  { id: "indigo", bg: "#312e81", border: "#818cf8", text: "#e0e7ff" },
  { id: "blue", bg: "#1e3a5f", border: "#3b82f6", text: "#dbeafe" },
  { id: "green", bg: "#14532d", border: "#22c55e", text: "#dcfce7" },
  { id: "orange", bg: "#7c2d12", border: "#f97316", text: "#fed7aa" },
  { id: "pink", bg: "#831843", border: "#ec4899", text: "#fce7f3" },
  { id: "yellow", bg: "#713f12", border: "#eab308", text: "#fef9c3" },
  { id: "red", bg: "#7f1d1d", border: "#ef4444", text: "#fee2e2" },
  { id: "teal", bg: "#134e4a", border: "#14b8a6", text: "#ccfbf1" },
];

export type AIProvider = "claude" | "gemini" | "openai" | "openrouter";

export interface AIProviderConfig {
  provider: AIProvider;
  apiKey: string;
  model: string | null;
}

export type PlanType = "free" | "pro";

export const FREE_PLAN_LIMITS = {
  maxMaps: 1,
  maxNodesPerMap: 100,
} as const;
