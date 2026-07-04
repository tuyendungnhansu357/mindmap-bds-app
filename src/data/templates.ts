// src/data/templates.ts
// Template BĐS đóng gói cứng trong app (mục 4.8 spec)
// parentId dùng string index "0", "1", ... để resolve trong handleUseTemplate

import { MindMapNode } from "../types/mindmap";

export interface TemplateNode {
  title: string;
  parentIndex: number | null; // index trong mảng nodes (null = root)
  color: string;
  icon: string | null;
  x: number;
  y: number;
  sortOrder: number;
}

export interface TemplateEntry {
  id: string;
  title: string;
  icon: string;
  description: string;
  nodes: TemplateNode[];
}

const BDS_TEMPLATES: TemplateEntry[] = [
  {
    id: "tpl_phan_tich_du_an",
    title: "Phân tích Dự án BĐS",
    icon: "🏗️",
    description: "Khung phân tích toàn diện cho 1 dự án bất động sản mới",
    nodes: [
      { title: "Dự án BĐS", parentIndex: null, color: "indigo", icon: "🏗️", x: 0, y: 0, sortOrder: 0 },
      { title: "Vị trí & Pháp lý", parentIndex: 0, color: "blue", icon: "📍", x: 260, y: -160, sortOrder: 0 },
      { title: "Tài chính", parentIndex: 0, color: "green", icon: "💰", x: 260, y: -40, sortOrder: 1 },
      { title: "Tiến độ", parentIndex: 0, color: "orange", icon: "📅", x: 260, y: 80, sortOrder: 2 },
      { title: "Rủi ro", parentIndex: 0, color: "red", icon: "⚠️", x: 260, y: 200, sortOrder: 3 },
      { title: "Sổ đỏ/sổ hồng", parentIndex: 1, color: "blue", icon: null, x: 520, y: -200, sortOrder: 0 },
      { title: "Quy hoạch", parentIndex: 1, color: "blue", icon: null, x: 520, y: -130, sortOrder: 1 },
      { title: "Vốn chủ sở hữu", parentIndex: 2, color: "green", icon: null, x: 520, y: -80, sortOrder: 0 },
      { title: "Vay ngân hàng", parentIndex: 2, color: "green", icon: null, x: 520, y: -20, sortOrder: 1 },
    ],
  },
  {
    id: "tpl_checklist_mua_nha",
    title: "Checklist Mua Nhà",
    icon: "✅",
    description: "Danh sách kiểm tra đầy đủ khi mua nhà ở thực",
    nodes: [
      { title: "Mua Nhà", parentIndex: null, color: "teal", icon: "🏠", x: 0, y: 0, sortOrder: 0 },
      { title: "Pháp lý", parentIndex: 0, color: "blue", icon: "📄", x: 220, y: -120, sortOrder: 0 },
      { title: "Tài chính", parentIndex: 0, color: "green", icon: "🏦", x: 220, y: 0, sortOrder: 1 },
      { title: "Vật lý/Kỹ thuật", parentIndex: 0, color: "orange", icon: "🔧", x: 220, y: 120, sortOrder: 2 },
      { title: "Kiểm tra sổ đỏ", parentIndex: 1, color: "blue", icon: null, x: 440, y: -160, sortOrder: 0 },
      { title: "Tra cứu quy hoạch", parentIndex: 1, color: "blue", icon: null, x: 440, y: -100, sortOrder: 1 },
      { title: "Vay tối đa 70% giá trị", parentIndex: 2, color: "green", icon: null, x: 440, y: -20, sortOrder: 0 },
      { title: "Kiểm tra nền móng", parentIndex: 3, color: "orange", icon: null, x: 440, y: 100, sortOrder: 0 },
      { title: "Điện/nước/thấm dột", parentIndex: 3, color: "orange", icon: null, x: 440, y: 160, sortOrder: 1 },
    ],
  },
  {
    id: "tpl_quy_trinh_cho_thue",
    title: "Quy trình Cho thuê",
    icon: "🔑",
    description: "SOP cho thuê nhà/căn hộ từ đăng tin đến ký hợp đồng",
    nodes: [
      { title: "Cho thuê BĐS", parentIndex: null, color: "pink", icon: "🔑", x: 0, y: 0, sortOrder: 0 },
      { title: "Chuẩn bị nhà", parentIndex: 0, color: "teal", icon: "🧹", x: 220, y: -120, sortOrder: 0 },
      { title: "Marketing", parentIndex: 0, color: "blue", icon: "📢", x: 220, y: 0, sortOrder: 1 },
      { title: "Sàng lọc khách", parentIndex: 0, color: "green", icon: "👥", x: 220, y: 120, sortOrder: 2 },
      { title: "Ký hợp đồng", parentIndex: 0, color: "yellow", icon: "✍️", x: 220, y: 240, sortOrder: 3 },
      { title: "Sửa chữa nhỏ", parentIndex: 1, color: "teal", icon: null, x: 440, y: -160, sortOrder: 0 },
      { title: "Chụp ảnh chuyên nghiệp", parentIndex: 1, color: "teal", icon: null, x: 440, y: -100, sortOrder: 1 },
      { title: "Đăng Batdongsan.com.vn", parentIndex: 2, color: "blue", icon: null, x: 440, y: -20, sortOrder: 0 },
      { title: "Đăng Zalo/Facebook", parentIndex: 2, color: "blue", icon: null, x: 440, y: 40, sortOrder: 1 },
    ],
  },
  {
    id: "tpl_so_sanh_bds",
    title: "So sánh Bất Động Sản",
    icon: "⚖️",
    description: "Matrix so sánh nhiều BĐS theo các tiêu chí quan trọng",
    nodes: [
      { title: "So sánh BĐS", parentIndex: null, color: "yellow", icon: "⚖️", x: 0, y: 0, sortOrder: 0 },
      { title: "BĐS A", parentIndex: 0, color: "blue", icon: "🏠", x: 220, y: -120, sortOrder: 0 },
      { title: "BĐS B", parentIndex: 0, color: "green", icon: "🏠", x: 220, y: 0, sortOrder: 1 },
      { title: "BĐS C", parentIndex: 0, color: "orange", icon: "🏠", x: 220, y: 120, sortOrder: 2 },
      { title: "Giá", parentIndex: 1, color: "blue", icon: null, x: 440, y: -160, sortOrder: 0 },
      { title: "Pháp lý", parentIndex: 1, color: "blue", icon: null, x: 440, y: -100, sortOrder: 1 },
      { title: "Vị trí", parentIndex: 1, color: "blue", icon: null, x: 440, y: -40, sortOrder: 2 },
      { title: "Giá", parentIndex: 2, color: "green", icon: null, x: 440, y: 20, sortOrder: 0 },
      { title: "Pháp lý", parentIndex: 2, color: "green", icon: null, x: 440, y: 80, sortOrder: 1 },
    ],
  },
];

export default BDS_TEMPLATES;

/**
 * Convert TemplateEntry → danh sách MindMapNode với IDs thực
 */
export function templateToNodes(
  template: TemplateEntry,
  mapId: string,
  idGenerator: () => string
): MindMapNode[] {
  const ids = template.nodes.map(() => idGenerator());
  return template.nodes.map((tn, i) => ({
    id: ids[i],
    mapId,
    parentId: tn.parentIndex !== null ? ids[tn.parentIndex] : null,
    title: tn.title,
    x: tn.x,
    y: tn.y,
    w: null,
    h: null,
    color: tn.color,
    icon: tn.icon,
    collapsed: false,
    relStyle: null,
    sortOrder: tn.sortOrder,
  }));
}
