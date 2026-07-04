# MindMap BĐS — React Native App

Ứng dụng mindmap bất động sản native, **offline-first**, không Firebase.

## Stack

| Thành phần | Lựa chọn |
|---|---|
| Framework | React Native + Expo (managed workflow) |
| Language | TypeScript strict |
| Canvas | react-native-svg + react-native-gesture-handler |
| Animation | react-native-reanimated (UI thread, 60fps) |
| State | Zustand |
| DB | expo-sqlite |
| AI | fetch trực tiếp (Claude / Gemini / OpenAI / OpenRouter) |
| Export | react-native-view-shot + expo-print + expo-sharing |
| Build | EAS Build (cloud, không cần Android Studio local) |

---

## Cài đặt & Chạy dev

```bash
# 1. Cài dependencies
npm install

# 2. Chạy Expo dev server
npm start

# 3. Scan QR bằng Expo Go app (Android/iOS)
#    HOẶC chạy trực tiếp trên emulator:
npm run android
```

---

## Build APK (release)

### Bước 1 — Cài EAS CLI
```bash
npm install -g eas-cli
eas login   # đăng nhập tài khoản expo.dev (tạo miễn phí)
```

### Bước 2 — Khởi tạo EAS project
```bash
eas init    # tạo projectId, tự điền vào app.json
```

### Bước 3 — Build APK preview (phân phối trực tiếp, không qua Play Store)
```bash
eas build -p android --profile preview
```
EAS Build chạy trên cloud (~10-15 phút). Kết quả là file `.apk` tải về cài thẳng.

### Bước 4 — Build App Bundle cho Play Store (tuỳ chọn)
```bash
eas build -p android --profile production
```

---

## Chạy Unit Tests

```bash
npx jest
```

Test bắt buộc (từ spec mục 8):
- `src/utils/__tests__/relStyle.test.ts` — merge relStyle không làm lộ field thừa
- `src/utils/__tests__/geometry.test.ts` — rectEdgePt() tính đúng điểm cạnh rect
- `src/services/__tests__/layoutEngine.test.ts` — 8 kiểu layout, subtree, pure function

---

## Sinh mã kích hoạt Pro

```bash
# Sinh 1 mã
node tools/generateLicenseCode.js

# Sinh 50 mã (bán qua Zalo)
node tools/generateLicenseCode.js 50
```

**Lưu ý:** Đổi `HMAC_SECRET` trong cả 2 file trước khi build production:
- `tools/generateLicenseCode.js` (dòng 13)
- `src/services/licenseService.ts` (dòng 15)

Secret mặc định `MMBDS_SECRET_2026_REPLACE_ME` chỉ dùng để dev/test.

---

## Cấu trúc thư mục

```
mindmap-bds-app/
├── app/                        # Expo Router screens
│   ├── (tabs)/
│   │   ├── home.tsx            # Danh sách MindMap (grid cards)
│   │   ├── templates.tsx       # Thư viện template BĐS
│   │   └── settings.tsx        # AI keys, theme, license
│   ├── editor/[mapId].tsx      # Canvas editor chính
│   └── _layout.tsx
├── src/
│   ├── components/
│   │   ├── canvas/
│   │   │   ├── MindMapCanvas.tsx      # 4-layer SVG canvas
│   │   │   ├── NodeShape.tsx          # Render node (memo'd)
│   │   │   ├── EdgePath.tsx           # Render edge cha-con
│   │   │   ├── CrossLinkPath.tsx      # Render cross-link
│   │   │   ├── ArrowMarker.tsx        # SVG <marker> defs
│   │   │   └── NodeActionBubble.tsx   # Action overlay
│   │   └── panels/
│   │       ├── NodeStylePanel.tsx     # Bottom sheet khi chọn node
│   │       ├── LinkStylePanel.tsx     # Bottom sheet khi chọn cross-link
│   │       └── AIGeneratorPanel.tsx   # AI prompt + generate
│   ├── store/
│   │   ├── mapStore.ts         # Zustand: doc, selection, CRUD
│   │   ├── settingsStore.ts    # AI keys (SecureStore), theme
│   │   └── undoStore.ts        # Undo/redo (snapshot-based)
│   ├── db/
│   │   ├── schema.ts           # SQLite CREATE TABLE statements
│   │   ├── index.ts            # DB connection singleton
│   │   └── mapRepository.ts    # CRUD maps/nodes/crossLinks
│   ├── services/
│   │   ├── layoutEngine.ts     # 8 layout algorithms (pure TS)
│   │   ├── aiService.ts        # Claude/Gemini/OpenAI/OpenRouter
│   │   ├── exportService.ts    # PNG/PDF/JSON/Markdown export
│   │   └── licenseService.ts   # Offline HMAC license verify
│   ├── types/mindmap.ts        # TypeScript types + constants
│   ├── data/templates.ts       # Template BĐS dựng sẵn
│   └── utils/
│       ├── relStyle.ts         # merge/effectiveStyle helpers
│       ├── geometry.ts         # rectEdgePt(), normalVector()
│       └── taperPath.ts        # Taper polygon builder
└── tools/
    └── generateLicenseCode.js  # Script sinh mã Pro (admin only)
```

---

## Nguyên tắc kiến trúc quan trọng (từ spec)

### 1. relStyle merge — KHÔNG bao giờ spread default vào storage
```typescript
// ✅ ĐÚNG — chỉ lưu field đã thay đổi
updateRelStyleField(existing, "shape", "orthogonal")
// → { ...existing, shape: "orthogonal" }

// ❌ SAI — "đóng băng" default vào data
{ ...DEFAULT_RELATION_STYLE, ...existing, shape: "orthogonal" }
```

### 2. Canvas 4-layer z-order (bắt buộc)
```
Layer 1: CrossLink paths  (vẽ trước, dưới cùng)
Layer 2: Edge cha-con     (vẽ giữa)
Layer 3: Nodes            (vẽ sau cùng — không bị edge đè)
Layer 4: ArrowMarker defs (ở SVG root, ngoài G transform)
```

### 3. Arrow marker placement
- Dùng `rectEdgePt()` — điểm giao tia nối tâm với **cạnh** node
- KHÔNG dùng toạ độ tâm node (marker bị node che)
- `markerUnits="userSpaceOnUse"` bắt buộc
- `<Defs>` phải ở **root** `<Svg>`, không lồng trong `<G transform>`

### 4. Persist debounce 500ms
```
SQLite chỉ ghi sau 500ms kể từ thay đổi cuối cùng.
Không ghi theo từng frame khi kéo node.
```

### 5. arrowEnd: "none" là default — không bao giờ đặt "arrow"
Lỗi này đã gây "arrow pollution" trên toàn bộ edge ở bản web.

---

## Lộ trình phát triển tiếp theo

- [ ] Checklist/SOP view (port `buildToolView()` từ web)
- [ ] Long-press multi-select + batch style
- [ ] Backup/Restore toàn bộ DB (export `.sqlite`)
- [ ] Cross-link control point drag (gesture handler)
- [ ] Thumbnail generation khi đóng editor
- [ ] In-app Purchase (Phương án B, khi cần scale)
- [ ] iOS build (đã thiết kế kiến trúc hỗ trợ mở rộng)

---

## Phân biệt với bản web (PWA)

| | Bản web (PWA/TWA) | App native này |
|---|---|---|
| Backend | Firebase | Không có |
| Auth | Email + Google | Không cần |
| Storage | Firestore + localStorage | SQLite local |
| Offline | Không hoàn toàn | 100% offline-first |
| Layout mobile | Sidebar port CSS (unstable) | Bottom Sheet native |
| Giấy phép | Admin Firebase nâng cấp | HMAC offline code |
| APK | TWA wrapper (web) | React Native native |
