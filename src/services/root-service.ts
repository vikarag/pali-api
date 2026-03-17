import { getDb } from "../db/connection.js";
import type { DpdRoot } from "../models/types.js";

interface RootResult {
  root: string;
  rootInComps: string;
  rootHasVerb: string;
  rootGroup: number;
  rootSign: string;
  rootMeaning: string;
  rootBase: string;
  sanskritRoot: string;
  sanskritRootMeaning: string;
  sanskritRootClass: string;
  rootExample: string;
  rootCount: number;
}

interface DerivedWord {
  id: number;
  lemma: string;
  pos: string;
  meaning: string;
  construction: string;
}

function toRootResult(row: DpdRoot): RootResult {
  return {
    root: row.root || "",
    rootInComps: row.root_in_comps || "",
    rootHasVerb: row.root_has_verb || "",
    rootGroup: row.root_group || 0,
    rootSign: row.root_sign || "",
    rootMeaning: row.root_meaning || "",
    rootBase: row.root_base || "",
    sanskritRoot: row.sanskrit_root || "",
    sanskritRootMeaning: row.sanskrit_root_meaning || "",
    sanskritRootClass: row.sanskrit_root_class || "",
    rootExample: row.root_example || "",
    rootCount: row.root_count || 0,
  };
}

export function listRoots(
  limit: number,
  offset: number
): { total: number; results: RootResult[] } {
  const db = getDb();

  const total = (
    db.prepare("SELECT COUNT(*) as cnt FROM dpd_roots").get() as {
      cnt: number;
    }
  ).cnt;

  const rows = db
    .prepare("SELECT * FROM dpd_roots ORDER BY root LIMIT ? OFFSET ?")
    .all(limit, offset) as DpdRoot[];

  return { total, results: rows.map(toRootResult) };
}

export function getRootDetail(
  rootKey: string
): { root: RootResult | null; derivedWords: DerivedWord[] } {
  const db = getDb();

  // Try exact match first
  let rootRow = db
    .prepare("SELECT * FROM dpd_roots WHERE root = ?")
    .get(rootKey) as DpdRoot | undefined;

  if (!rootRow) {
    // Try with/without leading √
    const alt = rootKey.startsWith("√")
      ? rootKey.slice(1)
      : `√${rootKey}`;
    rootRow = db
      .prepare("SELECT * FROM dpd_roots WHERE root = ?")
      .get(alt) as DpdRoot | undefined;
  }

  if (!rootRow) {
    // Fuzzy: LIKE match
    rootRow = db
      .prepare("SELECT * FROM dpd_roots WHERE root LIKE ?")
      .get(`%${rootKey}%`) as DpdRoot | undefined;
  }

  if (!rootRow) {
    return { root: null, derivedWords: [] };
  }

  const derivedRows = db
    .prepare(
      "SELECT id, lemma_1, pos, meaning_1, construction FROM dpd_headwords WHERE root_key = ? ORDER BY lemma_1"
    )
    .all(rootRow.root) as Array<{
    id: number;
    lemma_1: string;
    pos: string;
    meaning_1: string;
    construction: string;
  }>;

  const derivedWords: DerivedWord[] = derivedRows.map((r) => ({
    id: r.id,
    lemma: r.lemma_1,
    pos: r.pos || "",
    meaning: r.meaning_1 || "",
    construction: r.construction || "",
  }));

  return { root: toRootResult(rootRow), derivedWords };
}
