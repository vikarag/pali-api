import { DatabaseSync } from "node:sqlite";
import { config } from "../config.js";

let db: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (!db) {
    db = new DatabaseSync(config.dbPath, { readOnly: true });

    // Read-optimized pragmas (skip journal_mode — requires write access)
    db.exec("PRAGMA cache_size = -64000"); // 64MB
    db.exec("PRAGMA mmap_size = 268435456"); // 256MB
  }
  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
