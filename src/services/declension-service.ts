import { getDb } from "../db/connection.js";
import type { DeclensionTable } from "../models/types.js";
import { lookupWord } from "./word-service.js";

// Map abbreviated case names to full names
const CASE_MAP: Record<string, string> = {
  nom: "nominative",
  voc: "vocative",
  acc: "accusative",
  instr: "instrumental",
  dat: "dative",
  abl: "ablative",
  gen: "genitive",
  loc: "locative",
  "in comps": "in_compounds",
};

/**
 * Strip HTML tags except <b>/<\/b>, which differentiate stem from ending.
 */
function stripHtml(s: string): string {
  return s.replace(/<(?!\/?b>)[^>]+>/gi, "").trim();
}

/**
 * Parse a cell's HTML content into an array of forms.
 * Forms in DPD are separated by <br> tags.
 */
function parseCellForms(cellHtml: string): string[] {
  return cellHtml
    .split(/<br\s*\/?>/)
    .map(stripHtml)
    .filter(Boolean);
}

/**
 * Parse DPD inflections_html into structured declension table.
 *
 * HTML format:
 *   <tr><th>nom</th><td>dhamm<b>o</b></td><td>dhamm<b>ā</b><br>dhamm<b>āse</b></td></tr>
 */
function parseInflectionHtml(
  html: string
): Record<string, Record<string, string | string[]>> {
  const table: Record<string, Record<string, string | string[]>> = {};
  if (!html) return table;

  // Match each <tr>...</tr>
  const rowRegex = /<tr[^>]*>([\s\S]*?)<\/tr>/gi;
  let rowMatch;

  while ((rowMatch = rowRegex.exec(html)) !== null) {
    const rowContent = rowMatch[1];

    // Extract the <th> (case label) and <td> cells
    const thMatch = /<th[^>]*>([\s\S]*?)<\/th>/i.exec(rowContent);
    if (!thMatch) continue;

    const caseLabel = stripHtml(thMatch[1]).toLowerCase();
    const fullCase = CASE_MAP[caseLabel];
    if (!fullCase) continue; // skip header row

    // Extract all <td> cells
    const tdRegex = /<td[^>]*>([\s\S]*?)<\/td>/gi;
    const cells: string[][] = [];
    let tdMatch;
    while ((tdMatch = tdRegex.exec(rowContent)) !== null) {
      cells.push(parseCellForms(tdMatch[1]));
    }

    if (cells.length === 0) continue;

    table[fullCase] = {};
    if (cells[0] && cells[0].length > 0) {
      table[fullCase].singular =
        cells[0].length === 1 ? cells[0][0] : cells[0];
    }
    if (cells[1] && cells[1].length > 0) {
      table[fullCase].plural =
        cells[1].length === 1 ? cells[1][0] : cells[1];
    }
  }

  return table;
}

export function getDeclension(word: string): DeclensionTable[] {
  const results = lookupWord(word);
  const db = getDb();

  return results.map((r) => {
    const row = db
      .prepare("SELECT inflections_html, pattern FROM dpd_headwords WHERE id = ?")
      .get(r.id) as unknown as { inflections_html: string; pattern: string } | undefined;

    const table = parseInflectionHtml(row?.inflections_html || "");

    return {
      lemma: r.lemma,
      pos: r.pos,
      pattern: row?.pattern || "",
      inflections: r.inflections.list,
      table,
    };
  });
}
