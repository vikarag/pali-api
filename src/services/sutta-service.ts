import { getDb } from "../db/connection.js";
import type { SuttaReference } from "../models/types.js";

interface SuttaInfo {
  source: string;
  sutta: string;
  wordCount: number;
}

export function listSuttas(
  limit: number,
  offset: number
): { total: number; results: SuttaInfo[] } {
  const db = getDb();

  const rows = db
    .prepare(
      `SELECT source, sutta, COUNT(*) as word_count FROM (
        SELECT source_1 as source, sutta_1 as sutta FROM dpd_headwords
        WHERE source_1 IS NOT NULL AND source_1 != ''
        UNION ALL
        SELECT source_2 as source, sutta_2 as sutta FROM dpd_headwords
        WHERE source_2 IS NOT NULL AND source_2 != ''
      ) GROUP BY source
      ORDER BY source
      LIMIT ? OFFSET ?`
    )
    .all(limit, offset) as Array<{
    source: string;
    sutta: string;
    word_count: number;
  }>;

  const totalRow = db
    .prepare(
      `SELECT COUNT(DISTINCT source) as cnt FROM (
        SELECT source_1 as source FROM dpd_headwords
        WHERE source_1 IS NOT NULL AND source_1 != ''
        UNION
        SELECT source_2 as source FROM dpd_headwords
        WHERE source_2 IS NOT NULL AND source_2 != ''
      )`
    )
    .get() as { cnt: number };

  return {
    total: totalRow.cnt,
    results: rows.map((r) => ({
      source: r.source,
      sutta: r.sutta || "",
      wordCount: r.word_count,
    })),
  };
}

export function getWordsBySutta(
  source: string,
  limit: number,
  offset: number
): { total: number; results: SuttaReference[] } {
  const db = getDb();

  const rows = db
    .prepare(
      `SELECT id, lemma_1, source_1, sutta_1, example_1, source_2, sutta_2, example_2
      FROM dpd_headwords
      WHERE source_1 = ? OR source_2 = ?
      ORDER BY lemma_1
      LIMIT ? OFFSET ?`
    )
    .all(source, source, limit, offset) as Array<{
    id: number;
    lemma_1: string;
    source_1: string;
    sutta_1: string;
    example_1: string;
    source_2: string;
    sutta_2: string;
    example_2: string;
  }>;

  const totalRow = db
    .prepare(
      "SELECT COUNT(*) as cnt FROM dpd_headwords WHERE source_1 = ? OR source_2 = ?"
    )
    .get(source, source) as { cnt: number };

  const results: SuttaReference[] = [];
  for (const row of rows) {
    if (row.source_1 === source) {
      results.push({
        source: row.source_1,
        sutta: row.sutta_1 || "",
        example: row.example_1 || "",
        wordId: row.id,
        lemma: row.lemma_1,
      });
    }
    if (row.source_2 === source) {
      results.push({
        source: row.source_2,
        sutta: row.sutta_2 || "",
        example: row.example_2 || "",
        wordId: row.id,
        lemma: row.lemma_1,
      });
    }
  }

  return { total: totalRow.cnt, results };
}

export function getSuttasForWord(word: string): SuttaReference[] {
  const db = getDb();

  // Resolve word to headword IDs
  let ids: number[] = [];

  const directRows = db
    .prepare("SELECT id FROM dpd_headwords WHERE lemma_1 = ? OR lemma_1 LIKE ?")
    .all(word, `${word} %`) as Array<{ id: number }>;

  if (directRows.length > 0) {
    ids = directRows.map((r) => r.id);
  } else {
    const lookupRow = db
      .prepare("SELECT headwords FROM lookup WHERE lookup_key = ?")
      .get(word) as { headwords: string } | undefined;

    if (lookupRow && lookupRow.headwords) {
      try {
        const parsed = JSON.parse(lookupRow.headwords);
        ids = Array.isArray(parsed) ? parsed : [parsed];
      } catch {
        ids = [];
      }
    }
  }

  if (ids.length === 0) return [];

  const placeholders = ids.map(() => "?").join(",");
  const rows = db
    .prepare(
      `SELECT id, lemma_1, source_1, sutta_1, example_1, source_2, sutta_2, example_2
       FROM dpd_headwords WHERE id IN (${placeholders})`
    )
    .all(...ids) as Array<{
    id: number;
    lemma_1: string;
    source_1: string;
    sutta_1: string;
    example_1: string;
    source_2: string;
    sutta_2: string;
    example_2: string;
  }>;

  const results: SuttaReference[] = [];
  for (const row of rows) {
    if (row.source_1) {
      results.push({
        source: row.source_1,
        sutta: row.sutta_1 || "",
        example: row.example_1 || "",
        wordId: row.id,
        lemma: row.lemma_1,
      });
    }
    if (row.source_2) {
      results.push({
        source: row.source_2,
        sutta: row.sutta_2 || "",
        example: row.example_2 || "",
        wordId: row.id,
        lemma: row.lemma_1,
      });
    }
  }

  return results;
}
