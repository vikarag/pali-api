import { getDb } from "../../shared/db/connection.js";

export interface LookupData {
  grammar: string[][];
  headwords: number[];
  deconstructor: string[];
}

export interface AnalyzerHeadword {
  id: number;
  lemma_1: string;
  pos: string;
  grammar: string;
  meaning_1: string;
  meaning_lit: string;
  construction: string;
  compound_type: string;
  compound_construction: string;
  family_compound: string;
  root_key: string;
  root_sign: string;
  root_base: string;
  ebt_count: string;
  trans: string;
  plus_case: string;
}

function parseJson<T>(value: string | null | undefined, defaultVal: T): T {
  if (!value || value === "NULL") return defaultVal;
  try {
    const result = JSON.parse(value);
    return result || defaultVal;
  } catch {
    return defaultVal;
  }
}

export function lookupForm(form: string): LookupData {
  const db = getDb();
  const row = db
    .prepare(
      "SELECT grammar, headwords, deconstructor FROM lookup WHERE lookup_key = ?"
    )
    .get(form.toLowerCase()) as
    | { grammar: string; headwords: string; deconstructor: string }
    | undefined;

  if (!row) {
    return { grammar: [], headwords: [], deconstructor: [] };
  }

  return {
    grammar: parseJson<string[][]>(row.grammar, []),
    headwords: parseJson<number[]>(row.headwords, []),
    deconstructor: parseJson<string[]>(row.deconstructor, []),
  };
}

const HEADWORD_COLS = `id, lemma_1, pos, grammar, meaning_1, meaning_lit,
  construction, compound_type, compound_construction,
  family_compound, root_key, root_sign, root_base,
  ebt_count, trans, plus_case`;

export function getHeadword(hwId: number): AnalyzerHeadword | null {
  const db = getDb();
  const row = db
    .prepare(`SELECT ${HEADWORD_COLS} FROM dpd_headwords WHERE id = ?`)
    .get(hwId) as AnalyzerHeadword | undefined;
  return row ?? null;
}

export function getHeadwordsBatch(hwIds: number[]): AnalyzerHeadword[] {
  if (hwIds.length === 0) return [];
  const db = getDb();
  const placeholders = hwIds.map(() => "?").join(",");
  return db
    .prepare(
      `SELECT ${HEADWORD_COLS} FROM dpd_headwords WHERE id IN (${placeholders})`
    )
    .all(...hwIds) as unknown as AnalyzerHeadword[];
}

export function searchHeadwordByLemma(lemma: string): AnalyzerHeadword[] {
  const db = getDb();
  return db
    .prepare(
      `SELECT ${HEADWORD_COLS} FROM dpd_headwords
       WHERE lemma_1 = ? OR lemma_1 LIKE ?
       ORDER BY CAST(ebt_count AS INTEGER) DESC
       LIMIT 10`
    )
    .all(lemma, `${lemma} %`) as unknown as AnalyzerHeadword[];
}
