import type {
  GrammarAnalysis,
  WordToken,
  AnalyzedSentence,
} from "../../shared/models/types.js";

const VERB_POS_SET = new Set([
  "verb", "pr", "aor", "fut", "imp", "opt", "cond", "perf",
]);

export function disambiguate(sentence: AnalyzedSentence): void {
  const verbTokens = findVerbs(sentence);
  const verbNumber = extractVerbNumber(verbTokens);
  const nomTokenIdx = findNominativeCandidate(sentence);
  const verbInfo = extractVerbInfo(verbTokens);

  for (let i = 0; i < sentence.tokens.length; i++) {
    const token = sentence.tokens[i];
    if (token.isPunctuation || token.analyses.length <= 1) continue;

    for (let rank = 0; rank < token.analyses.length; rank++) {
      token.analyses[rank]._origRank = rank;
    }

    const isNomCandidate = i === nomTokenIdx;

    token.analyses.sort(
      (a, b) =>
        computeScore(b, token, i, verbTokens, verbNumber, sentence.tokens.length, isNomCandidate, verbInfo, sentence) -
        computeScore(a, token, i, verbTokens, verbNumber, sentence.tokens.length, isNomCandidate, verbInfo, sentence)
    );
    token.ambiguous = token.analyses.length > 1;
  }
}

interface VerbInfo {
  isTransitive: boolean;
  isPassive: boolean;
  plusCase: string;
}

function computeScore(
  a: GrammarAnalysis,
  token: WordToken,
  position: number,
  verbTokens: WordToken[],
  verbNumber: string,
  _totalTokens: number,
  isNomCandidate: boolean,
  verbInfo: VerbInfo,
  sentence: AnalyzedSentence
): number {
  let s = 0;

  // Indeclinable boost
  if (a.pos === "ind" || a.pos === "prefix" || a.tag?.startsWith("[Ind")) {
    s += 1000;
  }

  // Penalize letter POS
  if (a.pos === "letter") s -= 500;

  // POS coherence: penalize extra verb readings when another token is the verb
  if (VERB_POS_SET.has(a.pos) && verbTokens.length) {
    if (verbTokens.some((vt) => vt !== token)) s -= 50;
  }

  // Verb agreement + nominative
  if (isNomCandidate) {
    if (verbNumber === "sg" && a.inflection.includes("sg") && a.inflection.includes("nom")) {
      s += 40;
    } else if (verbNumber === "pl" && a.inflection.includes("pl") && a.inflection.includes("nom")) {
      s += 40;
    }
  }

  // Case governance
  const governedCase = verbInfo.plusCase;
  if (governedCase && !isNomCandidate) {
    const governedCases = new Set<string>();
    for (const gc of governedCase.replace(/\+/g, "").split(/\s+/)) {
      const clean = gc.trim().replace(/,$/, "");
      if (["acc", "instr", "dat", "abl", "gen", "loc"].includes(clean)) {
        governedCases.add(clean);
      }
    }
    for (const gc of governedCases) {
      if (a.inflection.includes(gc)) s += 25;
    }
  }

  // Non-nominative: boost accusative
  if (!isNomCandidate && a.inflection.includes("acc")) {
    if (!governedCase) s += 25;
    if (verbInfo.isTransitive && !governedCase) {
      if (["noun", "masc", "fem", "nt", "adj"].includes(a.pos)) {
        if (!sentenceHasCaseReading(sentence, token, "acc")) {
          s += 30;
        }
      }
    }
  }

  // Passive agent
  if (verbInfo.isPassive && !isNomCandidate) {
    if (a.inflection.includes("instr") && ["noun", "masc", "fem", "nt", "pron"].includes(a.pos)) {
      s += 35;
    }
  }

  // Gen/dat proximity
  if (a.inflection.includes("gen") || a.inflection.includes("dat")) {
    const neighbors = getNeighborPos(sentence, position);
    if (a.inflection.includes("gen") && neighbors.has("noun")) s += 15;
    if (a.inflection.includes("dat") && neighbors.has("verb")) s += 15;
  }

  // Position: first token favors nominative
  if (position === 0 && a.inflection.includes("nom")) s += 20;

  // Frequency
  s += Math.min(a.ebtCount / 100, 50);

  // Prefer noun over adjective
  const tokenIsPrimaryVerb = verbTokens.includes(token);
  if (a.pos === "noun" && !tokenIsPrimaryVerb) s += 10;
  else if (a.pos === "adj") s -= 5;

  // Penalize vocative
  if (a.inflection.includes("voc")) s -= 15;

  // Penalize headword-only verb entries without person
  if (VERB_POS_SET.has(a.pos)) {
    const hasPerson = ["1st", "2nd", "3rd"].some((p) => a.inflection.includes(p));
    if (!hasPerson && a.inflection) s -= 30;
  }

  // "Sentence needs verb"
  if (VERB_POS_SET.has(a.pos) && !verbTokens.length) s += 60;

  // Subject-predicate agreement
  if (["pp", "prp", "ptp", "adj"].includes(a.pos) && !isNomCandidate && a.inflection.includes("nom")) {
    const [subjGender, subjNumber] = extractSubjectGenderNumber(sentence, verbNumber);
    if (subjGender && a.inflection.includes(subjGender)) s += 15;
    if (subjNumber && a.inflection.includes(subjNumber)) s += 15;
    s += 20;
  }

  // DPD original order as tiebreaker
  s -= (a._origRank ?? 0) * 0.1;

  return s;
}

function findVerbs(sentence: AnalyzedSentence): WordToken[] {
  const verbs: WordToken[] = [];
  for (const token of sentence.tokens) {
    if (token.isPunctuation || !token.analyses.length) continue;
    const first = token.analyses[0];
    if (first.pos === "verb" || VERB_POS_SET.has(first.pos)) {
      verbs.push(token);
    }
  }
  return verbs;
}

function extractVerbNumber(verbTokens: WordToken[]): string {
  for (const vt of verbTokens) {
    for (const a of vt.analyses) {
      if (VERB_POS_SET.has(a.pos)) {
        if (a.inflection.includes("sg")) return "sg";
        if (a.inflection.includes("pl")) return "pl";
      }
    }
  }
  return "";
}

function findNominativeCandidate(sentence: AnalyzedSentence): number {
  for (let i = 0; i < sentence.tokens.length; i++) {
    const token = sentence.tokens[i];
    if (token.isPunctuation) continue;
    const hasNom = token.analyses.some((a) => a.inflection.includes("nom"));
    const hasInd = token.analyses.some(
      (a) => a.pos === "ind" || a.pos === "prefix"
    );
    if (hasNom && !hasInd) return i;
  }
  return -1;
}

function extractVerbInfo(verbTokens: WordToken[]): VerbInfo {
  const info: VerbInfo = { isTransitive: false, isPassive: false, plusCase: "" };
  for (const vt of verbTokens) {
    for (const a of vt.analyses) {
      if (a.pos !== "verb") continue;
      if (a.trans === "trans") info.isTransitive = true;
      if (a.inflection.includes("pass")) info.isPassive = true;
      if (a.plusCase) info.plusCase = a.plusCase;
      break;
    }
  }
  return info;
}

function sentenceHasCaseReading(
  sentence: AnalyzedSentence,
  excludeToken: WordToken,
  caseName: string
): boolean {
  for (const token of sentence.tokens) {
    if (token === excludeToken || token.isPunctuation) continue;
    if (token.analyses.length && token.analyses[0].inflection.includes(caseName)) {
      return true;
    }
  }
  return false;
}

function getNeighborPos(
  sentence: AnalyzedSentence,
  position: number
): Set<string> {
  const result = new Set<string>();
  for (const offset of [-1, 1]) {
    const idx = position + offset;
    if (idx >= 0 && idx < sentence.tokens.length) {
      const t = sentence.tokens[idx];
      if (!t.isPunctuation && t.analyses.length) {
        result.add(t.analyses[0].pos);
      }
    }
  }
  return result;
}

function extractSubjectGenderNumber(
  sentence: AnalyzedSentence,
  verbNumber: string
): [string, string] {
  const nomIdx = findNominativeCandidate(sentence);
  if (nomIdx < 0) return ["", verbNumber];

  const token = sentence.tokens[nomIdx];
  for (const a of token.analyses) {
    if (a.inflection.includes("nom")) {
      let gender = "";
      let number = "";
      for (const part of a.inflection.toLowerCase().split(/\s+/)) {
        if (part === "masc" || part === "fem" || part === "nt") gender = part;
        else if (part === "sg" || part === "pl") number = part;
      }
      if (gender || number) return [gender, number];
    }
  }

  return ["", verbNumber];
}
