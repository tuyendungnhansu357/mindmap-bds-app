// src/services/exportService.ts
//
// Mục 4.7 spec:
// - PNG: react-native-view-shot → lưu thư viện ảnh
// - PDF: PNG → expo-print → PDF
// - JSON: MindMapDoc → file .json → expo-sharing
// - Markdown: cây node → outline markdown
// - Import: đọc .json → khôi phục map

import * as FileSystem from "expo-file-system";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { MindMapDoc, MindMapNode } from "../types/mindmap";

// ---------- PNG (caller truyền vào URI từ react-native-view-shot) ----------
export async function exportPng(capturedUri: string, title: string): Promise<void> {
  const dest = `${FileSystem.documentDirectory}${sanitize(title)}.png`;
  await FileSystem.copyAsync({ from: capturedUri, to: dest });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(dest, { mimeType: "image/png", UTI: "public.png" });
  }
}

// ---------- PDF ----------
export async function exportPdf(capturedUri: string, title: string): Promise<void> {
  const base64 = await FileSystem.readAsStringAsync(capturedUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const html = `
    <html><body style="margin:0;padding:0;background:#0f1117;">
      <img src="data:image/png;base64,${base64}"
           style="max-width:100%;height:auto;display:block;" />
    </body></html>`;
  const { uri } = await Print.printToFileAsync({ html, base64: false });
  const dest = `${FileSystem.documentDirectory}${sanitize(title)}.pdf`;
  await FileSystem.moveAsync({ from: uri, to: dest });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(dest, { mimeType: "application/pdf", UTI: "com.adobe.pdf" });
  }
}

// ---------- JSON ----------
export async function exportJson(doc: MindMapDoc): Promise<void> {
  const json = JSON.stringify(doc, null, 2);
  const path = `${FileSystem.documentDirectory}${sanitize(doc.title)}.json`;
  await FileSystem.writeAsStringAsync(path, json, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(path, {
      mimeType: "application/json",
      UTI: "public.json",
    });
  }
}

// ---------- Import JSON ----------
export async function importJson(fileUri: string): Promise<MindMapDoc> {
  const raw = await FileSystem.readAsStringAsync(fileUri, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  const parsed = JSON.parse(raw) as MindMapDoc;
  if (!parsed.id || !Array.isArray(parsed.nodes)) {
    throw new Error("File JSON không đúng định dạng MindMap BĐS");
  }
  return parsed;
}

// ---------- Markdown ----------
export async function exportMarkdown(doc: MindMapDoc): Promise<void> {
  const md = docToMarkdown(doc);
  const path = `${FileSystem.documentDirectory}${sanitize(doc.title)}.md`;
  await FileSystem.writeAsStringAsync(path, md, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(path, {
      mimeType: "text/markdown",
      UTI: "net.daringfireball.markdown",
    });
  }
}

function docToMarkdown(doc: MindMapDoc): string {
  const lines: string[] = [`# ${doc.title}\n`];
  const childrenOf = new Map<string | null, MindMapNode[]>();
  for (const n of doc.nodes) {
    const key = n.parentId;
    if (!childrenOf.has(key)) childrenOf.set(key, []);
    childrenOf.get(key)!.push(n);
  }
  for (const list of childrenOf.values()) {
    list.sort((a, b) => a.sortOrder - b.sortOrder);
  }
  function walk(parentId: string | null, depth: number) {
    const children = childrenOf.get(parentId) ?? [];
    for (const n of children) {
      const icon = n.icon ? `${n.icon} ` : "";
      if (depth === 0) {
        lines.push(`\n## ${icon}${n.title}`);
      } else if (depth === 1) {
        lines.push(`\n### ${icon}${n.title}`);
      } else {
        lines.push(`${"  ".repeat(depth - 2)}- ${icon}${n.title}`);
      }
      walk(n.id, depth + 1);
    }
  }
  walk(null, 0);
  return lines.join("\n");
}

// ---------- Backup toàn bộ DB ----------
export async function exportFullBackup(docs: MindMapDoc[]): Promise<void> {
  const payload = { version: 1, exportedAt: Date.now(), maps: docs };
  const json = JSON.stringify(payload, null, 2);
  const path = `${FileSystem.documentDirectory}mindmap_bds_backup_${Date.now()}.json`;
  await FileSystem.writeAsStringAsync(path, json, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(path, { mimeType: "application/json" });
  }
}

function sanitize(name: string): string {
  return name.replace(/[^a-zA-Z0-9À-ỹ\s_-]/g, "").replace(/\s+/g, "_").substring(0, 50);
}
