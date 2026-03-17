import { getDb } from "../db/connection.js";
import type { CompoundResult } from "../models/types.js";
import { lookupWord } from "./word-service.js";

export function deconstructCompound(word: string): CompoundResult[] {
  const results = lookupWord(word);

  return results.map((r) => {
    const isCompound = !!(
      r.construction.compoundType ||
      r.construction.compoundConstruction ||
      r.related.familyCompound.length > 0
    );

    const components: CompoundResult["components"] = [];
    const db = getDb();

    if (isCompound && r.related.familyCompound.length > 0) {
      for (const compWord of r.related.familyCompound) {
        const compRow = db
          .prepare(
            "SELECT id, lemma_1, pos, meaning_1 FROM dpd_headwords WHERE lemma_1 = ? OR lemma_1 LIKE ? ORDER BY id LIMIT 1"
          )
          .get(compWord, `${compWord} %`) as
          | { id: number; lemma_1: string; pos: string; meaning_1: string }
          | undefined;

        components.push({
          word: compRow?.lemma_1 || compWord,
          meaning: compRow?.meaning_1 || "",
          pos: compRow?.pos || "",
        });
      }
    }

    // Fallback: parse from construction field
    if (components.length === 0 && r.construction.construction) {
      const parts = r.construction.construction
        .split("+")
        .map((s) => s.trim())
        .filter(Boolean);

      if (parts.length > 1) {
        for (const part of parts) {
          const cleanPart = part.replace(/^[√-]/, "").trim();
          if (cleanPart.length < 2) continue;

          const compRow = db
            .prepare(
              "SELECT id, lemma_1, pos, meaning_1 FROM dpd_headwords WHERE lemma_1 = ? OR lemma_1 LIKE ? ORDER BY id LIMIT 1"
            )
            .get(cleanPart, `${cleanPart} %`) as
            | { id: number; lemma_1: string; pos: string; meaning_1: string }
            | undefined;

          components.push({
            word: compRow?.lemma_1 || part,
            meaning: compRow?.meaning_1 || "",
            pos: compRow?.pos || "",
          });
        }
      }
    }

    return {
      word: r.lemma,
      isCompound,
      compoundType: r.construction.compoundType,
      construction: r.construction.construction,
      compoundConstruction: r.construction.compoundConstruction,
      components,
    };
  });
}
