import { getDb } from "../../shared/db/connection.js";
import { lookupWord } from "./word-service.js";
import { parseInflectionHtml } from "./declension-service.js";

const NOUN_POS_CODES = ["masc", "fem", "nt", "adj"];

export interface NounDeclensionResult {
  id: number;
  lemma: string;
  pos: string;
  grammar: string;
  meaning: string;
  pattern: string;
  declension: Record<string, Record<string, string | string[]>>;
}

export function getNounDeclension(word: string): NounDeclensionResult[] {
  const results = lookupWord(word);
  const db = getDb();

  const nounResults = results.filter((r) =>
    NOUN_POS_CODES.includes(r.pos.toLowerCase())
  );

  return nounResults.map((r) => {
    const row = db
      .prepare(
        "SELECT inflections_html, pattern FROM dpd_headwords WHERE id = ?"
      )
      .get(r.id) as
      | { inflections_html: string; pattern: string }
      | undefined;

    const declension = parseInflectionHtml(row?.inflections_html || "");

    return {
      id: r.id,
      lemma: r.lemma,
      pos: r.pos,
      grammar: r.grammar,
      meaning: r.meanings.primary,
      pattern: row?.pattern || "",
      declension,
    };
  });
}
