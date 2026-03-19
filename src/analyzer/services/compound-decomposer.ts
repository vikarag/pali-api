import type { CompoundInfo } from "../../shared/models/types.js";
import {
  lookupForm,
  searchHeadwordByLemma,
  getHeadwordsBatch,
  type LookupData,
} from "./lookup-service.js";
import { normalizePali } from "../../shared/utils/normalize.js";

interface ResolvedComponent {
  form: string;
  lemma: string;
  pos: string;
  meaning: string;
  headwordId: number | null;
  ebtCount: number;
}

interface DecompositionCandidate {
  components: ResolvedComponent[];
  score: number;
}

interface JunctureCandidate {
  left: string;
  rightRemainder: string;
}

const MIN_COMPONENT_LENGTH = 2;
const MAX_RECURSION_DEPTH = 8;
const MAX_CANDIDATES_PER_LEVEL = 6;
const VOWELS = new Set(["a", "ā", "i", "ī", "u", "ū", "e", "o"]);
const FINAL_VOWELS = ["a", "ā", "i", "ī", "u", "ū"];

const SHORT_TO_LONG: Record<string, string> = { a: "ā", i: "ī", u: "ū" };
const LONG_TO_SHORT: Record<string, string> = { ā: "a", ī: "i", ū: "u" };

const VOWEL_MERGE_RULES: Record<string, Array<[string, string]>> = {
  ā: [["a", "a"], ["ā", "a"], ["a", "ā"]],
  e: [["a", "i"], ["a", "ī"], ["ā", "i"], ["ā", "ī"]],
  o: [["a", "u"], ["a", "ū"], ["ā", "u"], ["ā", "ū"]],
  ī: [["i", "i"], ["i", "ī"], ["ī", "i"]],
  ū: [["u", "u"], ["u", "ū"], ["ū", "u"]],
};

const NASAL_TO_NIGGAHITA: Record<string, string> = {
  ṅ: "ṃ", ñ: "ṃ", ṇ: "ṃ", n: "ṃ", m: "ṃ",
};

export function decomposeCompound(form: string): CompoundInfo | null {
  form = normalizePali(form).toLowerCase();

  const segments = form.includes("-")
    ? form.split("-").filter(Boolean)
    : [form];

  const allComponents: ResolvedComponent[] = [];
  const memo = new Map<string, DecompositionCandidate | null>();

  for (const segment of segments) {
    // Always try decomposition first — don't accept known word as single component
    const result = decompose(segment, 0, memo);
    if (result && result.components.length >= 2) {
      allComponents.push(...result.components);
      continue;
    }
    // Couldn't decompose — accept as single component if known (for hyphen segments)
    const direct = tryDirectLookup(segment);
    if (direct) {
      allComponents.push(direct);
      continue;
    }
    return null;
  }

  if (allComponents.length < 2) return null;

  return buildCompoundInfo(allComponents);
}

function tryDirectLookup(form: string): ResolvedComponent | null {
  const data = lookupForm(form);
  if (data.grammar.length > 0 || data.headwords.length > 0) {
    return resolveComponent(form, data);
  }
  const headwords = searchHeadwordByLemma(form);
  if (headwords.length > 0) {
    const hw = headwords[0];
    return {
      form,
      lemma: hw.lemma_1.split(" ")[0],
      pos: hw.pos,
      meaning: hw.meaning_1 || "",
      headwordId: hw.id,
      ebtCount: Number(hw.ebt_count) || 0,
    };
  }
  return null;
}

function resolveComponent(
  form: string,
  data: LookupData
): ResolvedComponent {
  if (data.headwords.length > 0) {
    const headwords = getHeadwordsBatch(data.headwords);
    const best = headwords.reduce((a, b) =>
      (Number(b.ebt_count) || 0) > (Number(a.ebt_count) || 0) ? b : a
    );
    const lemma =
      data.grammar.length > 0 && data.grammar[0].length >= 1
        ? data.grammar[0][0]
        : best.lemma_1.split(" ")[0];
    const pos =
      data.grammar.length > 0 && data.grammar[0].length >= 2
        ? data.grammar[0][1]
        : best.pos;
    return {
      form,
      lemma,
      pos,
      meaning: best.meaning_1 || "",
      headwordId: best.id,
      ebtCount: Number(best.ebt_count) || 0,
    };
  }
  if (data.grammar.length > 0 && data.grammar[0].length >= 2) {
    return {
      form,
      lemma: data.grammar[0][0],
      pos: data.grammar[0][1],
      meaning: "",
      headwordId: null,
      ebtCount: 0,
    };
  }
  return { form, lemma: form, pos: "", meaning: "", headwordId: null, ebtCount: 0 };
}

function decompose(
  remainder: string,
  depth: number,
  memo: Map<string, DecompositionCandidate | null>
): DecompositionCandidate | null {
  if (remainder.length === 0) return { components: [], score: 0 };
  if (remainder.length < MIN_COMPONENT_LENGTH) return null;
  if (depth >= MAX_RECURSION_DEPTH) return null;

  if (memo.has(remainder)) return memo.get(remainder)!;

  // Accept direct match only for sub-parts (depth > 0), not the initial form
  if (depth > 0) {
    const direct = tryDirectLookup(remainder);
    if (direct) {
      const result: DecompositionCandidate = {
        components: [direct],
        score: scoreComponent(direct, remainder.length),
      };
      memo.set(remainder, result);
      return result;
    }
  }

  let bestCandidate: DecompositionCandidate | null = null;

  for (
    let splitPos = remainder.length - MIN_COMPONENT_LENGTH;
    splitPos >= MIN_COMPONENT_LENGTH;
    splitPos--
  ) {
    const prefixCandidates = generateJunctureCandidates(remainder, splitPos);
    let branchesExplored = 0;

    for (const { left, rightRemainder } of prefixCandidates) {
      if (branchesExplored >= MAX_CANDIDATES_PER_LEVEL) break;

      const leftResolved = tryDirectLookup(left);
      if (!leftResolved) continue;

      branchesExplored++;

      const rightResult = decompose(rightRemainder, depth + 1, memo);
      if (!rightResult) continue;

      const candidateScore =
        scoreComponent(leftResolved, remainder.length) + rightResult.score;

      const candidate: DecompositionCandidate = {
        components: [leftResolved, ...rightResult.components],
        score: candidateScore,
      };

      const candidateAvg =
        candidate.score / candidate.components.length;
      const bestAvg = bestCandidate
        ? bestCandidate.score / bestCandidate.components.length
        : -1;
      if (candidateAvg > bestAvg) {
        bestCandidate = candidate;
      }
    }

    // Greedy: if we found a valid decomposition at this prefix length, stop
    if (bestCandidate && bestCandidate.components[0].form.length >= splitPos) {
      break;
    }
  }

  memo.set(remainder, bestCandidate);
  return bestCandidate;
}

function generateJunctureCandidates(
  form: string,
  splitPos: number
): JunctureCandidate[] {
  const candidates: JunctureCandidate[] = [];
  const rawLeft = form.slice(0, splitPos);
  const rawRight = form.slice(splitPos);

  // 1. Raw split
  candidates.push({ left: rawLeft, rightRemainder: rawRight });

  // 2. Vowel elision: right starts with vowel, left may have lost final vowel
  if (rawRight.length > 0 && VOWELS.has(rawRight[0])) {
    for (const v of FINAL_VOWELS) {
      candidates.push({ left: rawLeft + v, rightRemainder: rawRight });
    }
  }

  // 3. Vowel sandhi reversal at juncture
  const lastChar = rawLeft[rawLeft.length - 1];
  if (lastChar && lastChar in VOWEL_MERGE_RULES) {
    const leftBase = rawLeft.slice(0, -1);
    for (const [leftEnd, rightStart] of VOWEL_MERGE_RULES[lastChar]) {
      candidates.push({
        left: leftBase + leftEnd,
        rightRemainder: rightStart + rawRight,
      });
    }
    // Vowel belongs entirely to right word
    if (rawLeft.length > MIN_COMPONENT_LENGTH) {
      candidates.push({
        left: rawLeft.slice(0, -1),
        rightRemainder: lastChar + rawRight,
      });
    }
  }

  // 4. Vowel length alternation (a↔ā, i↔ī, u↔ū)
  if (lastChar && rawLeft.length > 1) {
    if (lastChar in SHORT_TO_LONG) {
      candidates.push({
        left: rawLeft.slice(0, -1) + SHORT_TO_LONG[lastChar],
        rightRemainder: rawRight,
      });
    }
    if (lastChar in LONG_TO_SHORT) {
      candidates.push({
        left: rawLeft.slice(0, -1) + LONG_TO_SHORT[lastChar],
        rightRemainder: rawRight,
      });
    }
  }

  // 5. Niggahita assimilation reversal (class nasal → ṃ)
  if (rawLeft.length > 1 && lastChar in NASAL_TO_NIGGAHITA) {
    candidates.push({
      left: rawLeft.slice(0, -1) + NASAL_TO_NIGGAHITA[lastChar],
      rightRemainder: rawRight,
    });
  }

  // 6. Consonant gemination reversal (doubled consonant at start of right)
  if (
    rawRight.length >= 2 &&
    rawRight[0] === rawRight[1] &&
    !VOWELS.has(rawRight[0])
  ) {
    candidates.push({ left: rawLeft, rightRemainder: rawRight.slice(1) });
  }

  // 7. De-gemination at end of left
  if (rawLeft.length >= 2) {
    const c1 = rawLeft[rawLeft.length - 2];
    const c2 = rawLeft[rawLeft.length - 1];
    if (c1 === c2 && !VOWELS.has(c1)) {
      for (const v of ["a", "i", "u"]) {
        candidates.push({
          left: rawLeft.slice(0, -1) + v,
          rightRemainder: rawRight,
        });
      }
    }
  }

  // Deduplicate
  const seen = new Set<string>();
  return candidates.filter((c) => {
    const key = c.left + "|" + c.rightRemainder;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function scoreComponent(
  component: ResolvedComponent,
  totalLength: number
): number {
  let score = 0;
  score += (component.form.length / totalLength) * 40;
  if (component.headwordId !== null) score += 30;
  if (component.pos) score += 10;
  if (component.meaning) score += 10;
  score += Math.min(component.ebtCount / 500, 20);
  if (component.form.length <= 2) score -= 5;
  return score;
}

function buildCompoundInfo(
  components: ResolvedComponent[]
): CompoundInfo {
  const construction = components
    .map((c) => c.lemma || c.form)
    .join(" + ");

  const componentTuples: Array<[string, string, string]> = components.map(
    (c) => [c.lemma || c.form, c.pos || "", c.meaning || ""]
  );

  return {
    compoundType: "Compound",
    construction,
    components: componentTuples,
  };
}
