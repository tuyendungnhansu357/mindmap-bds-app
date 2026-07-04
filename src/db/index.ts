// src/db/index.ts
import * as SQLite from "expo-sqlite";
import { CREATE_TABLES_SQL } from "./schema";

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) return dbInstance;
  dbInstance = await SQLite.openDatabaseAsync("mindmap_bds.db");
  await dbInstance.execAsync(CREATE_TABLES_SQL);
  return dbInstance;
}

/** Dùng khi cần reset hoàn toàn (vd Restore từ backup) */
export async function closeDb(): Promise<void> {
  if (dbInstance) {
    await dbInstance.closeAsync();
    dbInstance = null;
  }
}
