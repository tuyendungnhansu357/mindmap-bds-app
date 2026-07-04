// src/utils/relStyle.ts
//
// QUY TẮC BẮT BUỘC (mục 3.3.1 spec):
// relStyle lưu trữ CHỈ field đã override. Khi user đổi 1 field, luôn merge
// theo dạng { ...existingRelStyle, [field]: value } — TUYỆT ĐỐI KHÔNG
// { ...DEFAULT_RELATION_STYLE, ...existingRelStyle, [field]: value } rồi lưu
// cả object đó, vì sẽ "đóng băng" các giá trị default (vd arrowEnd) vào data,
// khiến sau này đổi DEFAULT_RELATION_STYLE không ảnh hưởng map cũ.
//
// effectiveStyle() là nơi DUY NHẤT được phép merge với default, và merge đó
// chỉ dùng để render/tính toán, không bao giờ ghi ngược lại vào storage.

import { DEFAULT_RELATION_STYLE, RelationStyle } from "../types/mindmap";

/**
 * Cập nhật 1 field trong relStyle đã lưu (persisted), không kéo theo default.
 * Đây là hàm DUY NHẤT nên dùng khi user thay đổi style trong UI.
 */
export function updateRelStyleField<K extends keyof RelationStyle>(
  existing: Partial<RelationStyle> | null,
  field: K,
  value: RelationStyle[K]
): Partial<RelationStyle> {
  return {
    ...(existing ?? {}),
    [field]: value,
  };
}

/**
 * Áp 1 preset (batch link style) lên relStyle đã lưu.
 * QUAN TRỌNG (mục 3.3.2 spec): preset không được mang theo arrowStart/arrowEnd
 * trừ khi đây là preset người dùng chủ động chọn mũi tên (isArrowPreset=true).
 * Preset nét/hình dạng và preset mũi tên là 2 khái niệm tách biệt.
 */
export function applyPreset(
  existing: Partial<RelationStyle> | null,
  preset: Partial<RelationStyle>,
  isArrowPreset = false
): Partial<RelationStyle> {
  const safePreset = isArrowPreset
    ? preset
    : stripArrowFields(preset);
  return {
    ...(existing ?? {}),
    ...safePreset,
  };
}

function stripArrowFields(style: Partial<RelationStyle>): Partial<RelationStyle> {
  const { arrowStart, arrowEnd, ...rest } = style;
  return rest;
}

/**
 * Tính style hiệu lực để RENDER (merge với default). Kết quả của hàm này
 * KHÔNG BAO GIỜ được lưu trở lại vào nodes/crossLinks — chỉ dùng tạm thời.
 */
export function effectiveStyle(
  stored: Partial<RelationStyle> | null | undefined
): RelationStyle {
  return {
    ...DEFAULT_RELATION_STYLE,
    ...(stored ?? {}),
  };
}
