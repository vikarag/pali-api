import type { WordToken } from "../../shared/models/types.js";
import { normalizePali } from "../../shared/utils/normalize.js";

const PUNCTUATION = new Set(".,;:!?\"'()[]{}–—");

export function createWordToken(
  surface: string,
  isPunctuation = false
): WordToken {
  return {
    surface,
    analyses: [],
    sandhi: null,
    compound: null,
    isPunctuation,
    isSandhi: false,
    isCompound: false,
    ambiguous: false,
  };
}

export function tokenize(sentence: string): WordToken[] {
  sentence = normalizePali(sentence);
  const tokens: WordToken[] = [];
  const rawParts = sentence.trim().split(/\s+/);

  for (let part of rawParts) {
    if (!part) continue;

    // Strip leading punctuation
    while (part.length > 0 && PUNCTUATION.has(part[0])) {
      tokens.push(createWordToken(part[0], true));
      part = part.slice(1);
    }

    // Collect trailing punctuation
    const trailing: string[] = [];
    while (part.length > 0 && PUNCTUATION.has(part[part.length - 1])) {
      trailing.push(part[part.length - 1]);
      part = part.slice(0, -1);
    }

    // Core word token
    if (part) {
      tokens.push(createWordToken(part));
    }

    // Append trailing punctuation in order
    for (let i = trailing.length - 1; i >= 0; i--) {
      tokens.push(createWordToken(trailing[i], true));
    }
  }

  return tokens;
}
