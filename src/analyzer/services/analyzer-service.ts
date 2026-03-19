import type {
  GrammarAnalysis,
  WordToken,
  AnalyzedSentence,
  SandhiSplit,
  CompoundInfo,
} from "../../shared/models/types.js";
import { tokenize, createWordToken } from "./tokenizer.js";
import { lookupForm, getHeadwordsBatch } from "./lookup-service.js";
import {
  resolveSandhi,
  tryParticleStrip,
  buildAnalyses,
} from "./sandhi-service.js";
import { tryRuleBasedSplit } from "./sandhi-rules.js";
import { analyzeCompound } from "./compound-analyzer.js";
import { decomposeCompound } from "./compound-decomposer.js";
import { disambiguate } from "./disambiguator.js";
import { makeTag, makeCompoundTag } from "./tagger.js";
import { normalizePali } from "../../shared/utils/normalize.js";

export function analyzeSentence(text: string): AnalyzedSentence {
  const result: AnalyzedSentence = { original: text, tokens: [] };
  const tokens = tokenize(text);

  for (const token of tokens) {
    if (token.isPunctuation) {
      result.tokens.push(token);
      continue;
    }
    analyzeToken(token);
    result.tokens.push(token);
  }

  disambiguate(result);
  return result;
}

export function analyzeWord(word: string): WordToken {
  word = normalizePali(word);
  const token = createWordToken(word);
  analyzeToken(token);
  return token;
}

export function resolveSandhiOnly(form: string): SandhiSplit | null {
  form = normalizePali(form).toLowerCase();
  const data = lookupForm(form);

  if (data.deconstructor.length) {
    return resolveSandhi(form, data.deconstructor);
  }

  return tryParticleStrip(form) ?? tryRuleBasedSplit(form);
}

export function analyzeCompoundOnly(word: string): CompoundInfo | null {
  word = normalizePali(word).toLowerCase();
  const data = lookupForm(word);

  if (data.headwords.length) {
    const result = analyzeCompound(data.headwords);
    if (result) return result;
  }
  return decomposeCompound(word);
}

function analyzeToken(token: WordToken): void {
  const form = token.surface;
  const formLower = form.toLowerCase();

  // Step 1: Query lookup table
  const data = lookupForm(formLower);
  const { grammar, headwords: headwordIds, deconstructor } = data;

  // Step 2: Build analyses from grammar entries
  if (grammar.length) {
    token.analyses = buildAnalyses(formLower, data);
  }

  // Step 3: Sandhi resolution
  if (!grammar.length && deconstructor.length) {
    // Pure sandhi form — no direct grammar, only deconstructor
    token.isSandhi = true;
    token.sandhi = resolveSandhi(form, deconstructor);
    if (token.sandhi?.analyses.length) {
      promoteSandhiToToken(token);
    }
  } else if (!grammar.length && !deconstructor.length && !headwordIds.length) {
    // Not in lookup table — try particle stripping
    const sandhi = tryParticleStrip(formLower);
    if (sandhi) {
      token.isSandhi = true;
      token.sandhi = sandhi;
      promoteSandhiToToken(token);
    } else {
      // Rule-based sandhi reverse engine
      const ruleSandhi = tryRuleBasedSplit(formLower);
      if (ruleSandhi) {
        token.isSandhi = true;
        token.sandhi = ruleSandhi;
        promoteSandhiToToken(token);
      } else {
        // Recursive compound decomposition as last resort
        const decomposed = decomposeCompound(formLower);
        if (decomposed) {
          token.isCompound = true;
          token.compound = decomposed;
          const glossParts = decomposed.components
            .map((c) => c[2])
            .filter(Boolean);
          token.analyses = [
            {
              lemma: decomposed.components.map((c) => c[0]).join(" + "),
              pos: "compound",
              inflection: "",
              tag: "[Compound]",
              gloss: glossParts.join(" + "),
              headwordId: null,
              ebtCount: 0,
              compoundType: decomposed.compoundType,
              compoundConstruction: decomposed.construction,
              trans: "",
              plusCase: "",
            },
          ];
        }
      }
    }
  } else if (!grammar.length && headwordIds.length) {
    // No grammar but has headword IDs — likely indeclinable
    const headwords = getHeadwordsBatch(headwordIds);
    for (const hw of headwords) {
      const tag = makeTag(hw.pos, hw.grammar || "", hw.lemma_1, hw.pos);
      token.analyses.push({
        lemma: hw.lemma_1,
        pos: hw.pos,
        inflection: hw.grammar || "",
        tag,
        gloss: hw.meaning_1 || "",
        headwordId: hw.id,
        ebtCount: Number(hw.ebt_count) || 0,
        compoundType: "",
        compoundConstruction: "",
        trans: hw.trans || "",
        plusCase: hw.plus_case || "",
      });
    }
  }

  // Step 4: Compound analysis
  if (headwordIds.length) {
    const compound = analyzeCompound(headwordIds);
    if (compound) {
      token.isCompound = true;
      token.compound = compound;
      applyCompoundTag(token, compound.compoundType);
    }
  }

  // Step 5: Mark ambiguity
  if (token.analyses.length > 1) {
    token.ambiguous = true;
  }
}

function applyCompoundTag(token: WordToken, compoundType: string): void {
  for (let i = 0; i < token.analyses.length; i++) {
    const a = token.analyses[i];
    if (["noun", "masc", "fem", "nt", "adj"].includes(a.pos)) {
      token.analyses[i] = {
        ...a,
        tag: makeCompoundTag(compoundType, a.inflection),
      };
    }
  }
}

function promoteSandhiToToken(token: WordToken): void {
  if (!token.sandhi?.analyses.length) return;

  const combinedParts: GrammarAnalysis[] = [];
  for (const partAnalyses of token.sandhi.analyses) {
    if (partAnalyses.length) {
      combinedParts.push(partAnalyses[0]);
    }
  }

  if (combinedParts.length) {
    const glossParts = combinedParts.map((p) => {
      const g = p.gloss?.split(";")[0].trim();
      return g || p.lemma;
    });

    token.analyses = [
      {
        lemma: combinedParts.map((p) => p.lemma).join(" + "),
        pos: "sandhi",
        inflection: "",
        tag: "[Sandhi]",
        gloss: glossParts.join(" + "),
        headwordId: null,
        ebtCount: 0,
        compoundType: "",
        compoundConstruction: "",
        trans: "",
        plusCase: "",
      },
    ];
  }
}
