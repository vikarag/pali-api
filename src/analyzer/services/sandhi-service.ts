import type { GrammarAnalysis, SandhiSplit } from "../../shared/models/types.js";
import {
  lookupForm,
  getHeadwordsBatch,
  type LookupData,
  type AnalyzerHeadword,
} from "./lookup-service.js";
import { makeTag } from "./tagger.js";

export function resolveSandhi(
  form: string,
  deconstructorData: string[]
): SandhiSplit | null {
  if (!deconstructorData.length) return null;

  let bestSplit: SandhiSplit | null = null;
  let bestScore = -1;

  for (const splitStr of deconstructorData) {
    const parts = splitStr
      .split("+")
      .map((p) => p.trim())
      .filter(Boolean);
    if (!parts.length) continue;

    const split: SandhiSplit = { original: form, parts, analyses: [] };
    let score = 0;

    for (const part of parts) {
      const partData = lookupForm(part);
      const partAnalyses = buildAnalyses(part, partData);
      split.analyses.push(partAnalyses);
      if (partAnalyses.length) score++;
    }

    const adjustedScore = score * 10 - parts.length;
    if (adjustedScore > bestScore) {
      bestScore = adjustedScore;
      bestSplit = split;
    }
  }

  return bestSplit;
}

export function tryParticleStrip(form: string): SandhiSplit | null {
  const suffixes: Array<[string, string]> = [
    ["ti", "iti"],
    ["pi", "api"],
    ["va", "eva"],
    ["ca", "ca"],
  ];

  for (const [suffix, particle] of suffixes) {
    if (!form.endsWith(suffix) || form.length <= suffix.length + 1) continue;

    const stem = form.slice(0, -suffix.length);
    const stemVariants = [stem];
    if (stem.endsWith("ū")) stemVariants.push(stem.slice(0, -1) + "u");
    if (stem.endsWith("ī")) stemVariants.push(stem.slice(0, -1) + "i");
    if (stem.endsWith("ā")) stemVariants.push(stem.slice(0, -1) + "a");

    for (const sv of stemVariants) {
      const stemData = lookupForm(sv);
      if (stemData.grammar.length || stemData.headwords.length) {
        const stemAnalyses = buildAnalyses(sv, stemData);
        const particleData = lookupForm(particle);
        const particleAnalyses = buildAnalyses(particle, particleData);
        return {
          original: form,
          parts: [sv, particle],
          analyses: [stemAnalyses, particleAnalyses],
        };
      }
    }
  }

  return null;
}

export function buildAnalyses(
  form: string,
  lookupData: LookupData
): GrammarAnalysis[] {
  const analyses: GrammarAnalysis[] = [];
  const grammarEntries = lookupData.grammar;
  const headwordIds = lookupData.headwords;

  const headwordsById = new Map<number, AnalyzerHeadword>();
  if (headwordIds.length) {
    for (const hw of getHeadwordsBatch(headwordIds)) {
      headwordsById.set(hw.id, hw);
    }
  }

  const coveredHwIds = new Set<number>();

  if (grammarEntries.length) {
    for (const entry of grammarEntries) {
      if (entry.length < 3) continue;
      const [lemma, posType, inflection] = entry;

      const hw = findBestHeadword(lemma, posType, headwordsById);
      const hwPos = hw?.pos ?? "";
      const meaning = hw?.meaning_1 ?? "";
      const hwId = hw?.id ?? null;
      const ebt = hw ? Number(hw.ebt_count) || 0 : 0;

      if (hwId) coveredHwIds.add(hwId);

      const tag = makeTag(posType, inflection, lemma, hwPos);

      analyses.push({
        lemma,
        pos: posType,
        inflection,
        tag,
        gloss: meaning,
        headwordId: hwId,
        ebtCount: ebt,
        compoundType: "",
        compoundConstruction: "",
        trans: hw?.trans ?? "",
        plusCase: hw?.plus_case ?? "",
      });
    }
  }

  // Add analyses for headwords not covered by grammar entries
  for (const hwId of headwordIds) {
    if (coveredHwIds.has(hwId)) continue;
    const hw = headwordsById.get(hwId);
    if (!hw) continue;
    const cleanLemma = hw.lemma_1.split(" ")[0];
    const tag = makeTag(hw.pos, hw.grammar || "", cleanLemma, hw.pos);
    analyses.push({
      lemma: cleanLemma,
      pos: hw.pos,
      inflection: hw.grammar || "",
      tag,
      gloss: hw.meaning_1 || "",
      headwordId: hwId,
      ebtCount: Number(hw.ebt_count) || 0,
      compoundType: "",
      compoundConstruction: "",
      trans: hw.trans || "",
      plusCase: hw.plus_case || "",
    });
  }

  return analyses;
}

export function findBestHeadword(
  lemma: string,
  posType: string,
  headwordsById: Map<number, AnalyzerHeadword>
): AnalyzerHeadword | null {
  const candidates = Array.from(headwordsById.values());
  if (!candidates.length) return null;

  // Exact lemma + POS match
  for (const hw of candidates) {
    const cleanLemma = hw.lemma_1.split(" ")[0];
    if (cleanLemma === lemma && posMatches(posType, hw.pos)) return hw;
  }

  // Exact lemma match (any POS)
  for (const hw of candidates) {
    const cleanLemma = hw.lemma_1.split(" ")[0];
    if (cleanLemma === lemma) return hw;
  }

  // Fallback: highest ebt_count
  return candidates.reduce((best, hw) =>
    (Number(hw.ebt_count) || 0) > (Number(best.ebt_count) || 0) ? hw : best
  );
}

export function posMatches(lookupPos: string, headwordPos: string): boolean {
  const lp = lookupPos.toLowerCase();
  const hp = headwordPos.toLowerCase();

  if (lp === hp) return true;
  if (lp === "noun" && (hp === "masc" || hp === "fem" || hp === "nt"))
    return true;
  if ((lp === "masc" || lp === "fem" || lp === "nt") && hp === "noun")
    return true;
  if (
    lp === "verb" &&
    ["verb", "aor", "pr", "fut", "imp", "opt", "cond"].includes(hp)
  )
    return true;

  return false;
}
