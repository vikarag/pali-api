import { getDb } from "../../shared/db/connection.js";
import type { DpdHeadword } from "../../shared/models/types.js";

interface SearchOptions {
  limit: number;
  offset: number;
  pos?: string;
}

interface SearchResult {
  id: number;
  lemma: string;
  pos: string;
  meaning: string;
}

function toSearchResult(row: DpdHeadword): SearchResult {
  return {
    id: row.id,
    lemma: row.lemma_1,
    pos: row.pos || "",
    meaning: row.meaning_1 || "",
  };
}

export function searchExact(
  term: string,
  opts: SearchOptions
): { total: number; results: SearchResult[] } {
  const db = getDb();

  // Search lookup table
  const lookupRow = db
    .prepare("SELECT headwords FROM lookup WHERE lookup_key = ?")
    .get(term) as { headwords: string } | undefined;

  if (!lookupRow || !lookupRow.headwords) {
    return { total: 0, results: [] };
  }

  let ids: number[];
  try {
    const parsed = JSON.parse(lookupRow.headwords);
    ids = Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return { total: 0, results: [] };
  }

  if (ids.length === 0) {
    return { total: 0, results: [] };
  }

  const placeholders = ids.map(() => "?").join(",");
  let query = `SELECT * FROM dpd_headwords WHERE id IN (${placeholders})`;
  const params: (string | number)[] = [...ids];

  if (opts.pos) {
    query += " AND pos = ?";
    params.push(opts.pos);
  }

  const all = db.prepare(query).all(...params) as unknown as DpdHeadword[];
  const total = all.length;
  const paged = all.slice(opts.offset, opts.offset + opts.limit);

  return { total, results: paged.map(toSearchResult) };
}

export function searchPrefix(
  term: string,
  opts: SearchOptions
): { total: number; results: SearchResult[] } {
  const db = getDb();

  const pattern = `${term}%`;

  if (opts.pos) {
    const total = (
      db
        .prepare(
          "SELECT COUNT(*) as cnt FROM dpd_headwords WHERE lemma_1 LIKE ? AND pos = ?"
        )
        .get(pattern, opts.pos) as { cnt: number }
    ).cnt;
    const rows = db
      .prepare(
        "SELECT * FROM dpd_headwords WHERE lemma_1 LIKE ? AND pos = ? ORDER BY lemma_1 LIMIT ? OFFSET ?"
      )
      .all(pattern, opts.pos, opts.limit, opts.offset) as unknown as DpdHeadword[];
    return { total, results: rows.map(toSearchResult) };
  }

  const total = (
    db
      .prepare(
        "SELECT COUNT(*) as cnt FROM dpd_headwords WHERE lemma_1 LIKE ?"
      )
      .get(pattern) as { cnt: number }
  ).cnt;
  const rows = db
    .prepare(
      "SELECT * FROM dpd_headwords WHERE lemma_1 LIKE ? ORDER BY lemma_1 LIMIT ? OFFSET ?"
    )
    .all(pattern, opts.limit, opts.offset) as unknown as DpdHeadword[];
  return { total, results: rows.map(toSearchResult) };
}

export function searchEnglish(
  term: string,
  opts: SearchOptions
): { total: number; results: SearchResult[] } {
  const db = getDb();

  // Check if FTS table exists
  const ftsExists = db
    .prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='dpd_fts'"
    )
    .get();

  if (ftsExists) {
    // Use FTS5
    const ftsQuery = term
      .split(/\s+/)
      .filter(Boolean)
      .map((w) => `"${w}"`)
      .join(" OR ");

    if (opts.pos) {
      const all = db
        .prepare(
          `SELECT h.* FROM dpd_fts f
           JOIN dpd_headwords h ON h.id = f.rowid
           WHERE dpd_fts MATCH ? AND h.pos = ?
           ORDER BY rank`
        )
        .all(ftsQuery, opts.pos) as unknown as DpdHeadword[];
      return {
        total: all.length,
        results: all.slice(opts.offset, opts.offset + opts.limit).map(toSearchResult),
      };
    }

    const all = db
      .prepare(
        `SELECT h.* FROM dpd_fts f
         JOIN dpd_headwords h ON h.id = f.rowid
         WHERE dpd_fts MATCH ?
         ORDER BY rank`
      )
      .all(ftsQuery) as unknown as DpdHeadword[];
    return {
      total: all.length,
      results: all.slice(opts.offset, opts.offset + opts.limit).map(toSearchResult),
    };
  }

  // Fallback: LIKE search on meaning columns
  const likeTerm = `%${term}%`;
  if (opts.pos) {
    const rows = db
      .prepare(
        `SELECT * FROM dpd_headwords
         WHERE (meaning_1 LIKE ? OR meaning_lit LIKE ? OR meaning_2 LIKE ?)
         AND pos = ?
         ORDER BY lemma_1 LIMIT ? OFFSET ?`
      )
      .all(likeTerm, likeTerm, likeTerm, opts.pos, opts.limit, opts.offset) as unknown as DpdHeadword[];
    return { total: rows.length, results: rows.map(toSearchResult) };
  }

  const rows = db
    .prepare(
      `SELECT * FROM dpd_headwords
       WHERE meaning_1 LIKE ? OR meaning_lit LIKE ? OR meaning_2 LIKE ?
       ORDER BY lemma_1 LIMIT ? OFFSET ?`
    )
    .all(likeTerm, likeTerm, likeTerm, opts.limit, opts.offset) as unknown as DpdHeadword[];
  return { total: rows.length, results: rows.map(toSearchResult) };
}

export function searchRoot(
  term: string,
  opts: SearchOptions
): { total: number; results: SearchResult[] } {
  const db = getDb();

  if (opts.pos) {
    const total = (
      db
        .prepare(
          "SELECT COUNT(*) as cnt FROM dpd_headwords WHERE root_key = ? AND pos = ?"
        )
        .get(term, opts.pos) as { cnt: number }
    ).cnt;
    const rows = db
      .prepare(
        "SELECT * FROM dpd_headwords WHERE root_key = ? AND pos = ? ORDER BY lemma_1 LIMIT ? OFFSET ?"
      )
      .all(term, opts.pos, opts.limit, opts.offset) as unknown as DpdHeadword[];
    return { total, results: rows.map(toSearchResult) };
  }

  const total = (
    db
      .prepare(
        "SELECT COUNT(*) as cnt FROM dpd_headwords WHERE root_key = ?"
      )
      .get(term) as { cnt: number }
  ).cnt;
  const rows = db
    .prepare(
      "SELECT * FROM dpd_headwords WHERE root_key = ? ORDER BY lemma_1 LIMIT ? OFFSET ?"
    )
    .all(term, opts.limit, opts.offset) as unknown as DpdHeadword[];
  return { total, results: rows.map(toSearchResult) };
}

export function searchFuzzy(
  term: string,
  opts: SearchOptions
): { total: number; results: SearchResult[] } {
  const db = getDb();

  const prefixLen = Math.max(2, Math.floor(term.length * 0.6));
  const prefix = term.slice(0, prefixLen);

  const candidates = db
    .prepare(
      "SELECT * FROM dpd_headwords WHERE lemma_1 LIKE ? ORDER BY lemma_1 LIMIT 500"
    )
    .all(`${prefix}%`) as unknown as DpdHeadword[];

  const maxDist = Math.max(2, Math.floor(term.length * 0.3));
  const scored = candidates
    .map((row) => ({
      row,
      dist: levenshtein(term, row.lemma_1.replace(/ [\d.]+$/, "")),
    }))
    .filter((item) => item.dist <= maxDist)
    .sort((a, b) => a.dist - b.dist);

  const filtered = opts.pos
    ? scored.filter((s) => s.row.pos === opts.pos)
    : scored;

  const total = filtered.length;
  const paged = filtered.slice(opts.offset, opts.offset + opts.limit);

  return {
    total,
    results: paged.map((item) => toSearchResult(item.row)),
  };
}

function levenshtein(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () =>
    Array(n + 1).fill(0)
  );
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
    }
  }
  return dp[m][n];
}

export function browse(
  letter: string,
  opts: SearchOptions & { pos?: string }
): { total: number; results: SearchResult[] } {
  const db = getDb();
  const pattern = `${letter}%`;

  if (opts.pos) {
    const total = (
      db
        .prepare(
          "SELECT COUNT(*) as cnt FROM dpd_headwords WHERE lemma_1 LIKE ? AND pos = ?"
        )
        .get(pattern, opts.pos) as { cnt: number }
    ).cnt;
    const rows = db
      .prepare(
        "SELECT * FROM dpd_headwords WHERE lemma_1 LIKE ? AND pos = ? ORDER BY lemma_1 LIMIT ? OFFSET ?"
      )
      .all(pattern, opts.pos, opts.limit, opts.offset) as unknown as DpdHeadword[];
    return { total, results: rows.map(toSearchResult) };
  }

  const total = (
    db
      .prepare(
        "SELECT COUNT(*) as cnt FROM dpd_headwords WHERE lemma_1 LIKE ?"
      )
      .get(pattern) as { cnt: number }
  ).cnt;
  const rows = db
    .prepare(
      "SELECT * FROM dpd_headwords WHERE lemma_1 LIKE ? ORDER BY lemma_1 LIMIT ? OFFSET ?"
    )
    .all(pattern, opts.limit, opts.offset) as unknown as DpdHeadword[];
  return { total, results: rows.map(toSearchResult) };
}
