#!/usr/bin/env node
// tools/generateLicenseCode.js
// Chạy: node tools/generateLicenseCode.js [số_lượng]
// Ví dụ: node tools/generateLicenseCode.js 10
//
// QUAN TRỌNG: file này KHÔNG nằm trong app bundle. Chạy riêng trên máy
// admin để sinh mã kích hoạt, bán qua Zalo/Facebook cho khách.
//
// Secret phải khớp với HMAC_SECRET trong src/services/licenseService.ts

const crypto = require("crypto");
const SECRET = "MMBDS_SECRET_2026_REPLACE_ME"; // ← đổi secret ở đây VÀ trong licenseService.ts

function genCode() {
  // 6 ký tự base36 ngẫu nhiên làm payload
  const payload = Math.random().toString(36).substring(2, 8).toUpperCase().padEnd(6, "X");
  const hmac = crypto.createHmac("sha256", SECRET).update(payload).digest("hex");
  const cs = hmac.substring(0, 8).toUpperCase();
  return `MMBDS-${payload}-${cs.substring(0, 4)}-${cs.substring(4, 8)}`;
}

const count = parseInt(process.argv[2] ?? "1", 10);
if (isNaN(count) || count < 1 || count > 10000) {
  console.error("Số lượng không hợp lệ (1-10000)");
  process.exit(1);
}

console.log(`\n=== MindMap BĐS — Mã kích hoạt Pro (${count} mã) ===\n`);
for (let i = 0; i < count; i++) {
  console.log(genCode());
}
console.log("\n=== Xong ===\n");
