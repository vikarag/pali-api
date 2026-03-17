import { getDb } from "../db/connection.js";
import type { DpdHeadword, WordResult } from "../models/types.js";

function splitCsv(val: string): string[] {
  if (!val) return [];
  return val
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function toWordResult(row: DpdHeadword): WordResult {
  const examples: WordResult["examples"] = [];
  if (row.source_1 || row.example_1) {
    examples.push({
      source: row.source_1 || "",
      sutta: row.sutta_1 || "",
      text: row.example_1 || "",
    });
  }
  if (row.source_2 || row.example_2) {
    examples.push({
      source: row.source_2 || "",
      sutta: row.sutta_2 || "",
      text: row.example_2 || "",
    });
  }

  return {
    id: row.id,
    lemma: row.lemma_1,
    pos: row.pos || "",
    grammar: row.grammar || "",
    meanings: {
      primary: row.meaning_1 || "",
      literal: row.meaning_lit || "",
      buddhadatta: row.meaning_2 || "",
    },
    etymology: {
      root: row.root_key || "",
      rootSign: row.root_sign || "",
      rootBase: row.root_base || "",
      derivedFrom: row.derived_from || "",
      sanskrit: row.sanskrit || "",
      cognate: row.cognate || "",
      nonIa: row.non_ia || "",
      construction: row.construction || "",
    },
    examples,
    inflections: {
      list: splitCsv(row.inflections),
      html: row.inflections_html || "",
    },
    related: {
      synonyms: splitCsv(row.synonym),
      antonyms: splitCsv(row.antonym),
      variants: splitCsv(row.variant),
      familyRoot: row.family_root || "",
      familyWord: row.family_word || "",
      familyCompound: row.family_compound
        ? row.family_compound.split(" ").filter(Boolean)
        : [],
      familyIdioms: row.family_idioms
        ? row.family_idioms.split(" ").filter(Boolean)
        : [],
      familySet: row.family_set
        ? row.family_set.split(" ").filter(Boolean)
        : [],
    },
    construction: {
      construction: row.construction || "",
      derivative: row.derivative || "",
      suffix: row.suffix || "",
      phonetic: row.phonetic || "",
      compoundType: row.compound_type || "",
      compoundConstruction: row.compound_construction || "",
    },
    frequency: {
      ebtCount: row.ebt_count || "",
      html: row.freq_html || "",
    },
    verb: {
      type: row.verb || "",
      trans: row.trans || "",
      neg: row.neg || "",
      plusCase: row.plus_case || "",
    },
    commentary: row.commentary || "",
    notes: row.notes || "",
    link: row.link || "",
  };
}

/**
 * Resolve headword IDs from the lookup table's headwords JSON field.
 */
function parseHeadwordIds(headwordsJson: string): number[] {
  if (!headwordsJson) return [];
  try {
    const parsed = JSON.parse(headwordsJson);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return [];
  }
}

/**
 * Fetch headwords by an array of IDs.
 */
function fetchByIds(ids: number[]): DpdHeadword[] {
  if (ids.length === 0) return [];
  const db = getDb();
  const placeholders = ids.map(() => "?").join(",");
  return db
    .prepare(`SELECT * FROM dpd_headwords WHERE id IN (${placeholders})`)
    .all(...ids) as unknown as DpdHeadword[];
}

export function lookupWord(word: string): WordResult[] {
  const db = getDb();

  // First try direct headword match (lemma_1 can be "dhamma 1.01")
  // Match exact or with any trailing number suffix
  const direct = db
    .prepare(
      "SELECT * FROM dpd_headwords WHERE lemma_1 = ? OR lemma_1 LIKE ?"
    )
    .all(word, `${word} %`) as unknown as DpdHeadword[];

  if (direct.length > 0) {
    return direct.map(toWordResult);
  }

  // Try lookup table (inflected forms)
  const lookupRow = db
    .prepare("SELECT * FROM lookup WHERE lookup_key = ?")
    .get(word) as { lookup_key: string; headwords: string } | undefined;

  if (lookupRow) {
    const ids = parseHeadwordIds(lookupRow.headwords);
    if (ids.length > 0) {
      return fetchByIds(ids).map(toWordResult);
    }
  }

  return [];
}

export function getWordById(id: number): WordResult | null {
  const db = getDb();
  const row = db
    .prepare("SELECT * FROM dpd_headwords WHERE id = ?")
    .get(id) as DpdHeadword | undefined;
  return row ? toWordResult(row) : null;
}

export function getWordGrammar(word: string): Partial<WordResult>[] {
  const results = lookupWord(word);
  return results.map((r) => ({
    id: r.id,
    lemma: r.lemma,
    pos: r.pos,
    grammar: r.grammar,
    verb: r.verb,
  }));
}

export function getWordMeanings(word: string): Partial<WordResult>[] {
  const results = lookupWord(word);
  return results.map((r) => ({
    id: r.id,
    lemma: r.lemma,
    pos: r.pos,
    meanings: r.meanings,
  }));
}

export function getWordEtymology(word: string): Partial<WordResult>[] {
  const results = lookupWord(word);
  return results.map((r) => ({
    id: r.id,
    lemma: r.lemma,
    etymology: r.etymology,
  }));
}

export function getWordExamples(word: string): Partial<WordResult>[] {
  const results = lookupWord(word);
  return results.map((r) => ({
    id: r.id,
    lemma: r.lemma,
    examples: r.examples,
  }));
}

export function getWordRelated(word: string): Partial<WordResult>[] {
  const results = lookupWord(word);
  return results.map((r) => ({
    id: r.id,
    lemma: r.lemma,
    related: r.related,
  }));
}

export function getWordConstruction(word: string): Partial<WordResult>[] {
  const results = lookupWord(word);
  return results.map((r) => ({
    id: r.id,
    lemma: r.lemma,
    construction: r.construction,
  }));
}
