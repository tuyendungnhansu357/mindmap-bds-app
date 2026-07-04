// src/services/licenseService.ts
//
// Mục 9 — Phương án A: mã kích hoạt offline MMBDS-XXXX-XXXX-XXXX
// Verify bằng HMAC-SHA256 với secret key nhúng cứng.
// Admin sinh mã bằng script Node.js riêng (không nằm trong app).
//
// Lưu ý bảo mật: secret nhúng cứng trong app dễ bị reverse engineer.
// Đủ tốt cho use case thương mại nhỏ (bán qua Zalo/Facebook). Nếu cần
// bảo mật cao hơn, chuyển sang Ed25519 hoặc Phương án B (Google Play Billing).

import AsyncStorage from "@react-native-async-storage/async-storage";

const LICENSE_STORAGE_KEY = "mmbds_license_v1";
// Trong môi trường thực: secret nên được obfuscate bằng ProGuard/Hermes +
// không để hardcode dạng plain như vầy.
const HMAC_SECRET = "MMBDS_SECRET_2026_REPLACE_ME";
const LICENSE_PREFIX = "MMBDS-";

// ---------- HMAC-SHA256 (thuần JS, không cần native module) ----------
// Sử dụng Web Crypto API có sẵn trong Hermes engine.
async function hmacSha256Hex(message: string, secret: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Verify mã kích hoạt định dạng MMBDS-XXXX-XXXX-XXXX.
 * Format: MMBDS-{6 ký tự payload base36}-{4 ký tự checksum}-{4 ký tự checksum}
 * Thực ra logic chi tiết ở đây đơn giản: lấy phần sau prefix, tính HMAC
 * với phần payload, so sánh với phần checksum trong mã.
 */
export async function verifyLicenseCode(code: string): Promise<boolean> {
  try {
    const normalized = code.trim().toUpperCase();
    if (!normalized.startsWith(LICENSE_PREFIX)) return false;

    const parts = normalized.substring(LICENSE_PREFIX.length).split("-");
    if (parts.length < 3) return false;

    // parts[0] = payload, parts[1]+parts[2] = first 8 hex chars của HMAC
    const payload = parts[0];
    const expectedChecksum = (parts[1] + parts[2]).toLowerCase();
    const hmac = await hmacSha256Hex(payload, HMAC_SECRET);
    const actualChecksum = hmac.substring(0, 8);

    return actualChecksum === expectedChecksum;
  } catch {
    return false;
  }
}

export async function activateLicense(code: string): Promise<boolean> {
  const valid = await verifyLicenseCode(code);
  if (valid) {
    await AsyncStorage.setItem(LICENSE_STORAGE_KEY, JSON.stringify({
      code,
      activatedAt: Date.now(),
    }));
  }
  return valid;
}

export async function isProActivated(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(LICENSE_STORAGE_KEY);
    if (!raw) return false;
    const { code } = JSON.parse(raw);
    return verifyLicenseCode(code);
  } catch {
    return false;
  }
}

// ---------- Script sinh mã (chạy bằng Node.js riêng, không trong app) ----------
// Lưu vào file tools/generateLicenseCode.js trong repo.
// Ví dụ output: MMBDS-A3F2K9-E4C1-B8D2
export const LICENSE_GENERATOR_SCRIPT = `
// tools/generateLicenseCode.js (chạy: node tools/generateLicenseCode.js)
const crypto = require('crypto');
const SECRET = '${HMAC_SECRET}';
function genCode() {
  const payload = Math.random().toString(36).substring(2, 8).toUpperCase();
  const hmac = crypto.createHmac('sha256', SECRET).update(payload).digest('hex');
  const checksum = hmac.substring(0, 8).toUpperCase();
  return 'MMBDS-' + payload + '-' + checksum.substring(0,4) + '-' + checksum.substring(4,8);
}
const count = parseInt(process.argv[2] ?? '1');
for (let i = 0; i < count; i++) console.log(genCode());
`;
