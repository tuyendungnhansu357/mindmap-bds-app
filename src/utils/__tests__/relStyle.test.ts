// src/utils/__tests__/relStyle.test.ts
//
// Test case bắt buộc theo mục 8 spec:
// "đổi 1 field không được làm xuất hiện field khác trong object lưu trữ"

import { applyPreset, effectiveStyle, updateRelStyleField } from "../relStyle";
import { DEFAULT_RELATION_STYLE } from "../../types/mindmap";

describe("updateRelStyleField", () => {
  it("đổi 1 field không làm xuất hiện field khác trong object lưu trữ", () => {
    const existing = null;
    const result = updateRelStyleField(existing, "shape", "orthogonal");
    expect(Object.keys(result)).toEqual(["shape"]);
    expect(result.arrowEnd).toBeUndefined();
  });

  it("giữ nguyên các field khác đã có, chỉ thêm/ghi đè field mới", () => {
    const existing = { shape: "curved" as const };
    const result = updateRelStyleField(existing, "width", 2);
    expect(result).toEqual({ shape: "curved", width: 2 });
    expect(result.arrowEnd).toBeUndefined();
    expect(result.dashId).toBeUndefined();
  });

  it("không bao giờ spread DEFAULT_RELATION_STYLE vào kết quả", () => {
    const result = updateRelStyleField(null, "color", "#fff");
    for (const key of Object.keys(DEFAULT_RELATION_STYLE)) {
      if (key !== "color") {
        expect((result as any)[key]).toBeUndefined();
      }
    }
  });
});

describe("applyPreset", () => {
  it("preset không phải arrow preset thì KHÔNG mang theo arrowStart/arrowEnd", () => {
    const existing = { arrowEnd: "arrow" as const };
    const result = applyPreset(existing, { dashId: "dashed-thin", arrowEnd: "filled-arrow" }, false);
    // arrowEnd cũ phải được giữ nguyên, không bị preset (không phải arrow preset) ghi đè
    expect(result.arrowEnd).toBe("arrow");
    expect(result.dashId).toBe("dashed-thin");
  });

  it("arrow preset (isArrowPreset=true) thì được phép ghi đè arrow fields", () => {
    const existing = { arrowEnd: "arrow" as const };
    const result = applyPreset(existing, { arrowEnd: "filled-arrow" }, true);
    expect(result.arrowEnd).toBe("filled-arrow");
  });
});

describe("effectiveStyle", () => {
  it("merge với default chỉ để render, không có field thừa nào bị thiếu", () => {
    const stored = { shape: "orthogonal" as const };
    const result = effectiveStyle(stored);
    expect(result.shape).toBe("orthogonal");
    expect(result.arrowEnd).toBe(DEFAULT_RELATION_STYLE.arrowEnd);
    expect(result.dashId).toBe(DEFAULT_RELATION_STYLE.dashId);
  });

  it("stored=null trả về default nguyên vẹn", () => {
    expect(effectiveStyle(null)).toEqual(DEFAULT_RELATION_STYLE);
  });
});
