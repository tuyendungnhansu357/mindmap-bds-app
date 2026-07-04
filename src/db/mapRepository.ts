// src/db/mapRepository.ts
import { getDb } from "./index";
import {
  CrossLink,
  MindMapDoc,
  MindMapNode,
  RelationStyle,
} from "../types/mindmap";

function rowToNode(row: any): MindMapNode {
  return {
    id: row.id,
    mapId: row.map_id,
    parentId: row.parent_id,
    title: row.title,
    x: row.x,
    y: row.y,
    w: row.w,
    h: row.h,
    color: row.color,
    icon: row.icon,
    collapsed: !!row.collapsed,
    relStyle: row.rel_style_json ? JSON.parse(row.rel_style_json) : null,
    sortOrder: row.sort_order ?? 0,
  };
}

function rowToCrossLink(row: any): CrossLink {
  return {
    id: row.id,
    mapId: row.map_id,
    fromId: row.from_id,
    toId: row.to_id,
    label: row.label,
    color: row.color,
    cpx: row.cpx,
    cpy: row.cpy,
    relStyle: row.rel_style_json ? JSON.parse(row.rel_style_json) : null,
  };
}

export async function listMaps(): Promise<
  Array<{ id: string; title: string; updatedAt: number; thumbnailUri: string | null }>
> {
  const db = await getDb();
  const rows = await db.getAllAsync<any>(
    `SELECT id, title, updated_at, thumbnail_uri FROM maps ORDER BY updated_at DESC`
  );
  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    updatedAt: r.updated_at,
    thumbnailUri: r.thumbnail_uri,
  }));
}

export async function loadMapDoc(mapId: string): Promise<MindMapDoc | null> {
  const db = await getDb();
  const mapRow = await db.getFirstAsync<any>(
    `SELECT * FROM maps WHERE id = ?`,
    [mapId]
  );
  if (!mapRow) return null;

  const nodeRows = await db.getAllAsync<any>(
    `SELECT * FROM nodes WHERE map_id = ? ORDER BY sort_order ASC`,
    [mapId]
  );
  const crossLinkRows = await db.getAllAsync<any>(
    `SELECT * FROM cross_links WHERE map_id = ?`,
    [mapId]
  );

  return {
    id: mapRow.id,
    title: mapRow.title,
    createdAt: mapRow.created_at,
    updatedAt: mapRow.updated_at,
    layoutType: mapRow.layout_type,
    pwdHash: mapRow.pwd_hash,
    nodes: nodeRows.map(rowToNode),
    crossLinks: crossLinkRows.map(rowToCrossLink),
  };
}

export async function createMap(doc: {
  id: string;
  title: string;
  layoutType: MindMapDoc["layoutType"];
}): Promise<void> {
  const db = await getDb();
  const now = Date.now();
  await db.runAsync(
    `INSERT INTO maps (id, title, created_at, updated_at, layout_type, pwd_hash, thumbnail_uri)
     VALUES (?, ?, ?, ?, ?, NULL, NULL)`,
    [doc.id, doc.title, now, now, doc.layoutType]
  );
}

export async function deleteMap(mapId: string): Promise<void> {
  const db = await getDb();
  // ON DELETE CASCADE lo phần nodes/cross_links
  await db.runAsync(`DELETE FROM maps WHERE id = ?`, [mapId]);
}

export async function renameMap(mapId: string, title: string): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE maps SET title = ?, updated_at = ? WHERE id = ?`,
    [title, Date.now(), mapId]
  );
}

export async function setMapThumbnail(
  mapId: string,
  thumbnailUri: string
): Promise<void> {
  const db = await getDb();
  await db.runAsync(`UPDATE maps SET thumbnail_uri = ? WHERE id = ?`, [
    thumbnailUri,
    mapId,
  ]);
}

/**
 * Ghi toàn bộ doc xuống SQLite trong 1 transaction.
 * Được gọi bởi store sau debounce 500ms (mục 2.3 spec) — KHÔNG gọi trực
 * tiếp từ mỗi thao tác UI để tránh ghi liên tục khi kéo node.
 */
export async function persistMapDoc(doc: MindMapDoc): Promise<void> {
  const db = await getDb();
  await db.withTransactionAsync(async () => {
    await db.runAsync(
      `UPDATE maps SET title = ?, updated_at = ?, layout_type = ?, pwd_hash = ? WHERE id = ?`,
      [doc.title, Date.now(), doc.layoutType, doc.pwdHash, doc.id]
    );

    // Xoá rồi insert lại toàn bộ nodes/crossLinks của map này (đơn giản, an
    // toàn cho quy mô <=1000 node theo giới hạn mục 7 spec).
    await db.runAsync(`DELETE FROM nodes WHERE map_id = ?`, [doc.id]);
    await db.runAsync(`DELETE FROM cross_links WHERE map_id = ?`, [doc.id]);

    for (const n of doc.nodes) {
      await db.runAsync(
        `INSERT INTO nodes (id, map_id, parent_id, title, x, y, w, h, color, icon, collapsed, rel_style_json, sort_order)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          n.id,
          doc.id,
          n.parentId,
          n.title,
          n.x,
          n.y,
          n.w,
          n.h,
          n.color,
          n.icon,
          n.collapsed ? 1 : 0,
          n.relStyle ? JSON.stringify(n.relStyle) : null,
          n.sortOrder,
        ]
      );
    }

    for (const cl of doc.crossLinks) {
      await db.runAsync(
        `INSERT INTO cross_links (id, map_id, from_id, to_id, label, color, cpx, cpy, rel_style_json)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          cl.id,
          doc.id,
          cl.fromId,
          cl.toId,
          cl.label,
          cl.color,
          cl.cpx,
          cl.cpy,
          cl.relStyle ? JSON.stringify(cl.relStyle) : null,
        ]
      );
    }
  });
}

export async function countNodesInMap(mapId: string): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ c: number }>(
    `SELECT COUNT(*) as c FROM nodes WHERE map_id = ?`,
    [mapId]
  );
  return row?.c ?? 0;
}

export async function countMaps(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ c: number }>(
    `SELECT COUNT(*) as c FROM maps`
  );
  return row?.c ?? 0;
}
