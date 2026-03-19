import type { SandhiSplit } from "../../shared/models/types.js";
import { lookupForm } from "./lookup-service.js";
import { buildAnalyses } from "./sandhi-service.js";

const VOWEL_RULES: Array<[string, Array<[string, string]>]> = [
  ["ā", [["a", "a"]]],
  ["e", [["a", "i"], ["a", "ī"], ["ā", "i"], ["ā", "ī"]]],
  ["o", [["a", "u"], ["a", "ū"], ["ā", "u"], ["ā", "ū"]]],
  ["ī", [["i", "i"], ["i", "ī"], ["ī", "i"]]],
  ["ū", [["u", "u"], ["u", "ū"], ["ū", "u"]]],
];

const VOWELS = new Set("aāiīuūeo");

const NIGGAHITA_RULES: Array<[string, string]> = [
  ["ṅ", "ṃ"],
  ["ñ", "ṃ"],
  ["ṇ", "ṃ"],
  ["n", "ṃ"],
  ["m", "ṃ"],
];

const NIGGAHITA_NEXT: Record<string, Set<string>> = {
  ṅ: new Set(["k", "kh", "g", "gh", "ṅ"]),
  ñ: new Set(["c", "ch", "j", "jh", "ñ"]),
  ṇ: new Set(["ṭ", "ṭh", "ḍ", "ḍh", "ṇ"]),
  n: new Set(["t", "th", "d", "dh", "n"]),
  m: new Set(["p", "ph", "b", "bh", "m"]),
};

export function tryRuleBasedSplit(form: string): SandhiSplit | null {
  return (
    tryVowelSandhi(form) ??
    tryNiggahitaSandhi(form) ??
    tryGemination(form) ??
    tryElisionWithGemination(form)
  );
}

function validateSplit(left: string, right: string): number | null {
  if (!left || !right) return null;

  const leftData = lookupForm(left.toLowerCase());
  const rightData = lookupForm(right.toLowerCase());

  const leftOk = leftData.grammar.length > 0 || leftData.headwords.length > 0;
  const rightOk =
    rightData.grammar.length > 0 || rightData.headwords.length > 0;

  if (leftOk && rightOk) return 20;
  if (leftOk || rightOk) return 5;
  return null;
}

function makeSplit(form: string, left: string, right: string): SandhiSplit {
  const leftData = lookupForm(left.toLowerCase());
  const rightData = lookupForm(right.toLowerCase());

  return {
    original: form,
    parts: [left, right],
    analyses: [
      buildAnalyses(left.toLowerCase(), leftData),
      buildAnalyses(right.toLowerCase(), rightData),
    ],
  };
}

function tryVowelSandhi(form: string): SandhiSplit | null {
  let best: SandhiSplit | null = null;
  let bestScore = -1;

  for (let i = 1; i < form.length; i++) {
    const char = form[i];
    for (const [merged, restorations] of VOWEL_RULES) {
      if (char !== merged) continue;
      for (const [leftEnd, rightStart] of restorations) {
        const left = form.slice(0, i) + leftEnd;
        const right = rightStart + form.slice(i + 1);
        const score = validateSplit(left, right);
        if (score !== null && score > bestScore) {
          bestScore = score;
          best = makeSplit(form, left, right);
        }
      }
    }
  }

  // V6: y + vowel ← i/ī + vowel
  for (let i = 1; i < form.length - 1; i++) {
    if (form[i] === "y" && VOWELS.has(form[i + 1])) {
      for (const leftEnd of ["i", "ī"]) {
        const left = form.slice(0, i) + leftEnd;
        const right = form.slice(i + 1);
        const score = validateSplit(left, right);
        if (score !== null && (best === null || score > bestScore)) {
          bestScore = score;
          best = makeSplit(form, left, right);
        }
      }
    }
  }

  // V7: v + vowel ← u/ū + vowel
  for (let i = 1; i < form.length - 1; i++) {
    if (form[i] === "v" && VOWELS.has(form[i + 1])) {
      for (const leftEnd of ["u", "ū"]) {
        const left = form.slice(0, i) + leftEnd;
        const right = form.slice(i + 1);
        const score = validateSplit(left, right);
        if (score !== null && (best === null || score > bestScore)) {
          bestScore = score;
          best = makeSplit(form, left, right);
        }
      }
    }
  }

  return best;
}

function tryNiggahitaSandhi(form: string): SandhiSplit | null {
  let best: SandhiSplit | null = null;
  let bestScore = -1;

  for (let i = 1; i < form.length - 1; i++) {
    const char = form[i];
    for (const [nasal, original] of NIGGAHITA_RULES) {
      if (char !== nasal) continue;
      const rest = form.slice(i + 1);
      const validNext = NIGGAHITA_NEXT[nasal];
      if (!validNext) continue;

      let nextOk = false;
      if (rest.length >= 2 && validNext.has(rest.slice(0, 2))) nextOk = true;
      else if (rest.length >= 1 && validNext.has(rest[0])) nextOk = true;
      if (!nextOk) continue;

      const left = form.slice(0, i) + original;
      const right = form.slice(i + 1);
      const score = validateSplit(left, right);
      if (score !== null && score > bestScore) {
        bestScore = score;
        best = makeSplit(form, left, right);
      }
    }
  }

  // N6: d/m before vowel ← ṃ + vowel
  for (let i = 1; i < form.length - 1; i++) {
    if ((form[i] === "d" || form[i] === "m") && VOWELS.has(form[i + 1])) {
      const left = form.slice(0, i) + "ṃ";
      const right = form.slice(i + 1);
      const score = validateSplit(left, right);
      if (score !== null && (best === null || score > bestScore)) {
        bestScore = score;
        best = makeSplit(form, left, right);
      }
    }
  }

  return best;
}

function tryGemination(form: string): SandhiSplit | null {
  let best: SandhiSplit | null = null;
  let bestScore = -1;

  for (let i = 2; i < form.length - 1; i++) {
    if (form[i] === form[i + 1] && !VOWELS.has(form[i])) {
      const left = form.slice(0, i);
      const right = form.slice(i + 1);
      const score = validateSplit(left, right);
      if (score !== null && score > bestScore) {
        bestScore = score;
        best = makeSplit(form, left, right);
      }
    }
  }

  return best;
}

function tryElisionWithGemination(form: string): SandhiSplit | null {
  let best: SandhiSplit | null = null;
  let bestScore = -1;

  for (let i = 1; i < form.length - 1; i++) {
    if (form[i] === form[i + 1] && !VOWELS.has(form[i])) {
      for (const vowel of ["a", "i", "u"]) {
        const left = form.slice(0, i) + vowel;
        const right = form.slice(i);
        const score = validateSplit(left, right);
        if (score !== null && score > bestScore) {
          bestScore = score;
          best = makeSplit(form, left, right);
        }
      }
    }
  }

  return best;
}
