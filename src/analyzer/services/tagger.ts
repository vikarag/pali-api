const POS_MAP: Record<string, string> = {
  noun: "N",
  masc: "N",
  fem: "N",
  nt: "N",
  adj: "Adj",
  verb: "V",
  ind: "Ind",
  pron: "Pron",
  pp: "PP",
  prp: "Part",
  ptp: "FPP",
  prefix: "Prefix",
  suffix: "Suffix",
  cs: "V",
  aor: "V",
  perf: "V",
  cond: "V",
  imp: "V",
  opt: "V",
  fut: "V",
  ger: "Ger",
  abs: "Ger",
  inf: "Inf",
  card: "Num",
  ordin: "Num",
  letter: "Letter",
  idiom: "Idiom",
  sandhi: "Sandhi",
};

const GENDER_MAP: Record<string, string> = {
  masc: "m",
  fem: "f",
  nt: "n",
};

const NUMBER_MAP: Record<string, string> = {
  sg: "sg",
  pl: "pl",
  du: "du",
};

const CASE_MAP: Record<string, string> = {
  nom: "nom",
  acc: "acc",
  instr: "ins",
  dat: "dat",
  abl: "abl",
  gen: "gen",
  loc: "loc",
  voc: "voc",
};

export const TENSE_MAP: Record<string, string> = {
  pr: "pres",
  aor: "aor",
  fut: "fut",
  imp: "imp",
  opt: "opt",
  cond: "cond",
  perf: "perf",
};

const VOICE_MAP: Record<string, string> = {
  act: "act",
  reflx: "mid",
  pass: "pass",
};

const PERSON_MAP: Record<string, string> = {
  "1st": "1",
  "2nd": "2",
  "3rd": "3",
};

const INDECLINABLE_SUBTYPES: Record<string, string> = {
  // Negative
  na: "neg", no: "neg", mā: "neg",
  // Conjunctions
  ca: "conj", pana: "conj", atha: "conj", tu: "conj", ce: "conj",
  sace: "conj", yadi: "conj", athavā: "conj", yadā: "conj", tadā: "conj",
  yāva: "conj", tāva: "conj", kiñca: "conj", apica: "conj",
  // Disjunctive
  vā: "disj", uda: "disj", udāhu: "disj",
  // Quotative
  iti: "quot", ti: "quot",
  // Emphatic
  eva: "emph", pi: "emph", api: "emph", kho: "emph", hi: "emph",
  nūna: "emph", su: "emph", have: "emph", kira: "emph", khalu: "emph",
  addhā: "emph", vata: "emph", jātu: "emph", nāma: "emph", ve: "emph",
  vho: "emph",
  // Temporal
  ajja: "temp", suve: "temp", hiyyo: "temp", sadā: "temp",
  sabbadā: "temp", kadā: "temp", purā: "temp", pacchā: "temp",
  idāni: "temp", dāni: "temp", aparena: "temp", muhuttaṃ: "temp",
  // Spatial
  idha: "spat", tattha: "spat", tatra: "spat", yatra: "spat",
  kattha: "spat", ettha: "spat", uddhaṃ: "spat", adho: "spat",
  samantā: "spat", sabbato: "spat", dūre: "spat", santike: "spat",
  anto: "spat", bahi: "spat", bahiddhā: "spat", paccattaṃ: "spat",
  ārakā: "spat",
  // Causal
  tasmā: "caus", yasmā: "caus", kasmā: "caus", tena: "caus",
  // Adverbial
  tathā: "adv", evaṃ: "adv", yathā: "adv", seyyathā: "adv",
  seyyathīdaṃ: "adv", viya: "adv", iva: "adv", saddhiṃ: "adv",
  saha: "adv", puna: "adv", ekamantaṃ: "adv", paṭhamaṃ: "adv",
  paraṃ: "adv", alaṃ: "adv", saṃkhittena: "adv", sakkā: "adv",
  nānā: "adv", vinā: "adv", āvi: "adv", raho: "adv",
  // Exclamatives
  handa: "excl", sādhu: "excl", namo: "excl", aho: "excl",
  dhī: "excl", are: "excl", re: "excl", ambho: "excl",
  // Interrogative
  nu: "interr", kiṃ: "interr", kacci: "interr", kathaṃ: "interr",
  kudā: "interr", kuto: "interr", kahaṃ: "interr", kuvaṃ: "interr",
  kuhiṃ: "interr",
};

const COMPOUND_TAG_ABBREV: Record<string, string> = {
  Kammadhāraya: "Kammadh",
  Tappurisa: "Tappurisa",
  Dvanda: "Dvanda",
  Bahubbīhi: "Bahubbīhi",
  Avyayībhāva: "Avyayī",
  Digu: "Digu",
};

function makeVerbTag(parts: string[]): string {
  let voice = "act";
  let tense = "";
  let person = "";
  let number = "";

  for (const p of parts) {
    if (p in VOICE_MAP) voice = VOICE_MAP[p];
    else if (p in TENSE_MAP) tense = TENSE_MAP[p];
    else if (p in PERSON_MAP) person = PERSON_MAP[p];
    else if (p in NUMBER_MAP) number = NUMBER_MAP[p];
  }

  if (!tense) tense = "pres";

  const components = ["V", tense, voice];
  if (person && number) components.push(`${person}${number}`);

  return `[${components.join(".")}]`;
}

export function makeTag(
  posType: string,
  inflection: string,
  lemma = "",
  headwordPos = ""
): string {
  const effectivePos = headwordPos
    ? headwordPos.toLowerCase()
    : posType.toLowerCase();
  const cleanLemma = lemma ? lemma.split(" ")[0] : "";

  // Handle indeclinables
  if (effectivePos === "ind" || effectivePos === "prefix") {
    const subtype = INDECLINABLE_SUBTYPES[cleanLemma];
    if (subtype) return `[Ind.${subtype}]`;
    if (inflection.includes("conj")) return "[Ind.conj]";
    if (inflection.includes("neg")) return "[Ind.neg]";
    if (inflection.includes("interr")) return "[Ind.interr]";
    return "[Ind]";
  }

  const parts = inflection.toLowerCase().split(/\s+/);

  // Verb tags
  if (posType.toLowerCase() === "verb" || effectivePos in TENSE_MAP) {
    return makeVerbTag(parts);
  }

  // Nominal tags
  const posLabel =
    POS_MAP[effectivePos] ??
    POS_MAP[posType.toLowerCase()] ??
    posType.toUpperCase();

  let gender = "";
  let number = "";
  let caseName = "";

  for (const p of parts) {
    if (p in GENDER_MAP) gender = GENDER_MAP[p];
    else if (p in NUMBER_MAP) number = NUMBER_MAP[p];
    else if (p in CASE_MAP) caseName = CASE_MAP[p];
  }

  const components = [posLabel];
  if (gender) components.push(gender);
  if (number) components.push(number);
  if (caseName) components.push(caseName);

  return `[${components.join(".")}]`;
}

export function makeCompoundTag(
  compoundType: string,
  inflection: string
): string {
  const abbrev = COMPOUND_TAG_ABBREV[compoundType] ?? compoundType;
  const parts = inflection.toLowerCase().split(/\s+/);

  let gender = "";
  let number = "";
  let caseName = "";

  for (const p of parts) {
    if (p in GENDER_MAP) gender = GENDER_MAP[p];
    else if (p in NUMBER_MAP) number = NUMBER_MAP[p];
    else if (p in CASE_MAP) caseName = CASE_MAP[p];
  }

  const components = [abbrev];
  if (gender) components.push(gender);
  if (number) components.push(number);
  if (caseName) components.push(caseName);

  return `[${components.join(".")}]`;
}
