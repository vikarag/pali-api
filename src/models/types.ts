// DPD Headword — matches dpd_headwords table
export interface DpdHeadword {
  id: number;
  lemma_1: string;
  lemma_2: string;
  pos: string;
  grammar: string;
  derived_from: string;
  neg: string;
  verb: string;
  trans: string;
  plus_case: string;
  meaning_1: string;
  meaning_lit: string;
  meaning_2: string;
  non_ia: string;
  sanskrit: string;
  cognate: string;
  root_key: string;
  root_sign: string;
  root_base: string;
  family_root: string;
  family_word: string;
  family_compound: string;
  family_idioms: string;
  family_set: string;
  construction: string;
  derivative: string;
  suffix: string;
  phonetic: string;
  compound_type: string;
  compound_construction: string;
  source_1: string;
  sutta_1: string;
  example_1: string;
  source_2: string;
  sutta_2: string;
  example_2: string;
  antonym: string;
  synonym: string;
  variant: string;
  commentary: string;
  notes: string;
  link: string;
  stem: string;
  pattern: string;
  inflections: string;
  inflections_api_ca_eva_iti: string;
  inflections_sinhala: string;
  inflections_devanagari: string;
  inflections_thai: string;
  inflections_html: string;
  freq_html: string;
  ebt_count: string;
  origin: string;
  created_at: string;
  updated_at: string;
}

// Lookup table — maps inflected forms to headword IDs
export interface LookupRow {
  lookup_key: string;
  headwords: string; // JSON array of headword IDs
  grammar: string;
}

// DPD Root — matches dpd_roots table
export interface DpdRoot {
  root: string;
  root_in_comps: string;
  root_has_verb: string;
  root_group: number;
  root_sign: string;
  root_meaning: string;
  root_base: string;
  sanskrit_root: string;
  sanskrit_root_meaning: string;
  sanskrit_root_class: string;
  root_example: string;
  root_count: number;
  [key: string]: unknown;
}

// API Response types
export interface WordResult {
  id: number;
  lemma: string;
  pos: string;
  grammar: string;
  meanings: {
    primary: string;
    literal: string;
    buddhadatta: string;
  };
  etymology: {
    root: string;
    rootSign: string;
    rootBase: string;
    derivedFrom: string;
    sanskrit: string;
    cognate: string;
    nonIa: string;
    construction: string;
  };
  examples: Array<{
    source: string;
    sutta: string;
    text: string;
  }>;
  inflections: {
    list: string[];
  };
  related: {
    synonyms: string[];
    antonyms: string[];
    variants: string[];
    familyRoot: string;
    familyWord: string;
    familyCompound: string[];
    familyIdioms: string[];
    familySet: string[];
  };
  construction: {
    construction: string;
    derivative: string;
    suffix: string;
    phonetic: string;
    compoundType: string;
    compoundConstruction: string;
  };
  frequency: {
    ebtCount: string;
  };
  verb: {
    type: string;
    trans: string;
    neg: string;
    plusCase: string;
  };
  commentary: string;
  notes: string;
  link: string;
}

export interface DeclensionTable {
  lemma: string;
  pos: string;
  pattern: string;
  inflections: string[];
  table: Record<string, Record<string, string | string[]>>;
}

export interface CompoundResult {
  word: string;
  isCompound: boolean;
  compoundType: string;
  construction: string;
  compoundConstruction: string;
  components: Array<{
    word: string;
    meaning: string;
    pos: string;
  }>;
}

export interface SuttaReference {
  source: string;
  sutta: string;
  example: string;
  wordId: number;
  lemma: string;
}

export interface PaginatedResponse<T> {
  query: string;
  total: number;
  limit: number;
  offset: number;
  results: T[];
}
