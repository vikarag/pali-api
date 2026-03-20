import { getDb } from "../../shared/db/connection.js";
import { lookupWord } from "./word-service.js";
import { stripHtml, parseCellForms } from "./declension-service.js";

const TENSE_MAP: Record<string, string> = {
  pr: "present",
  imp: "imperative",
  opt: "optative",
  cond: "conditional",
  fut: "future",
  perf: "perfect",
  aor: "aorist",
  imperf: "imperfect",
};

const PERSON_MAP: Record<string, string> = {
  "1st": "first",
  "2nd": "second",
  "3rd": "third",
};

const VERB_POS_CODES = [
  "pr",
  "aor",
  "fut",
  "imp",
  "opt",
  "cond",
  "perf",
  "imperf",
];

interface ConjugationCell {
  singular?: string | string[];
  plural?: string | string[];
  reflexive_singular?: string | string[];
  reflexive_plural?: string | string[];
}

type ConjugationTable = Record<string, Record<string, ConjugationCell>>;

/**
 * Detect column mapping from the header row.
 * Verb tables have columns like: sg, pl, reflexive sg, reflexive pl
 */
function detectColumns(headerRow: string): string[] {
  const thRegex = /<th[^>]*>([\s\S]*?)<\/th>/gi;
  const cols: string[] = [];
  let m;
  while ((m = thRegex.exec(headerRow)) !== null) {
    const label = stripHtml(m[1]).toLowerCase().trim();
    if (!label) continue;
    cols.push(label);
  }
  return cols;
}

function colToKey(col: string): string {
  if (col === "sg") return "singular";
  if (col === "pl") return "plural";
  if (col === "reflx sg" || col === "reflexive sg") return "reflexive_singular";
  if (col === "reflx pl" || col === "reflexive pl") return "reflexive_plural";
  return col;
}

function cellValue(forms: string[]): string | string[] | undefined {
  if (forms.length === 0) return undefined;
  return forms.length === 1 ? forms[0] : forms;
}

/**
 * Parse verb inflections_html into a structured conjugation table.
 *
 * Row labels look like "pr 3rd", "imp 2nd", "aor 1st", etc.
 */
export function parseConjugationHtml(html: string): ConjugationTable {
  const table: ConjugationTable = {};
  if (!html) return table;

  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  const rows: string[] = [];
  let m;
  while ((m = rowRegex.exec(html)) !== null) {
    rows.push(m[1]);
  }

  if (rows.length === 0) return table;

  // First row with multiple <th> is the header
  let columns: string[] = [];
  let dataStartIndex = 0;
  for (let i = 0; i < rows.length; i++) {
    const cols = detectColumns(rows[i]);
    if (cols.length >= 2) {
      columns = cols;
      dataStartIndex = i + 1;
      break;
    }
  }

  if (columns.length === 0) {
    // Fallback: assume sg, pl
    columns = ["sg", "pl"];
    dataStartIndex = 1;
  }

  for (let i = dataStartIndex; i < rows.length; i++) {
    const rowContent = rows[i];
    const thMatch = /<th[^>]*>([\s\S]*?)<\/th>/i.exec(rowContent);
    if (!thMatch) continue;

    const label = stripHtml(thMatch[1]).toLowerCase().trim();
    if (!label) continue;

    // Parse label: "pr 3rd" → tense=present, person=third
    const parts = label.split(/\s+/);
    if (parts.length < 2) continue;

    const tenseAbbr = parts[0];
    const personAbbr = parts[1];
    const tense = TENSE_MAP[tenseAbbr];
    const person = PERSON_MAP[personAbbr];
    if (!tense || !person) continue;

    // Extract <td> cells
    const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    const cells: string[][] = [];
    let td;
    while ((td = tdRegex.exec(rowContent)) !== null) {
      cells.push(parseCellForms(td[1]));
    }

    if (!table[tense]) table[tense] = {};

    const cell: ConjugationCell = {};
    for (let c = 0; c < columns.length && c < cells.length; c++) {
      const key = colToKey(columns[c]) as keyof ConjugationCell;
      const val = cellValue(cells[c]);
      if (val !== undefined) {
        (cell as Record<string, string | string[]>)[key] = val;
      }
    }

    table[tense][person] = cell;
  }

  return table;
}

export interface VerbConjugationResult {
  id: number;
  lemma: string;
  pos: string;
  grammar: string;
  meaning: string;
  pattern: string;
  conjugation: ConjugationTable;
}

export function getVerbConjugation(word: string): VerbConjugationResult[] {
  const results = lookupWord(word);
  const db = getDb();

  const verbResults = results.filter((r) =>
    VERB_POS_CODES.includes(r.pos.toLowerCase())
  );

  return verbResults.map((r) => {
    const row = db
      .prepare(
        "SELECT inflections_html, pattern FROM dpd_headwords WHERE id = ?"
      )
      .get(r.id) as
      | { inflections_html: string; pattern: string }
      | undefined;

    const conjugation = parseConjugationHtml(row?.inflections_html || "");

    return {
      id: r.id,
      lemma: r.lemma,
      pos: r.pos,
      grammar: r.grammar,
      meaning: r.meanings.primary,
      pattern: row?.pattern || "",
      conjugation,
    };
  });
}
