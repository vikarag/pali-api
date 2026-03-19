import type { CompoundInfo } from "../../shared/models/types.js";
import { getHeadword, searchHeadwordByLemma } from "./lookup-service.js";

const COMPOUND_TYPES: Record<string, string> = {
  kammadhāraya: "Kammadhāraya",
  tappurisa: "Tappurisa",
  dvanda: "Dvanda",
  bahubbīhi: "Bahubbīhi",
  avyayībhāva: "Avyayībhāva",
  digu: "Digu",
  abyayībhāva: "Avyayībhāva",
};

function resolveCompoundType(ctype: string): string {
  let primary: string;
  if (ctype.includes(">")) {
    const parts = ctype.split(">").map((p) => p.trim().toLowerCase());
    primary = parts[parts.length - 1];
  } else {
    primary = ctype.trim().toLowerCase();
  }
  return (
    COMPOUND_TYPES[primary] ??
    primary.charAt(0).toUpperCase() + primary.slice(1)
  );
}

function parseComponents(
  construction: string,
  familyCompound: string
): Array<[string, string, string]> {
  let parts: string[] = [];

  if (construction) {
    for (let segment of construction.split("+")) {
      segment = segment.trim();
      if (!segment) continue;
      if (segment.includes(">")) {
        segment = segment.split(">").pop()!.trim();
      }
      if (segment.startsWith("√")) {
        segment = segment.slice(1);
      }
      parts.push(segment);
    }
  }

  if (!parts.length && familyCompound) {
    parts = familyCompound.split(/\s+/).filter(Boolean);
  }

  const components: Array<[string, string, string]> = [];
  for (const part of parts) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const headwords = searchHeadwordByLemma(trimmed);
    if (headwords.length) {
      const hw = headwords[0];
      components.push([trimmed, hw.pos || "", hw.meaning_1 || ""]);
    } else {
      components.push([trimmed, "", ""]);
    }
  }

  return components;
}

export function analyzeCompound(headwordIds: number[]): CompoundInfo | null {
  for (const hwId of headwordIds) {
    const hw = getHeadword(hwId);
    if (!hw) continue;

    const ctype = hw.compound_type || "";
    if (!ctype) continue;

    const construction =
      hw.compound_construction || hw.construction || "";
    const family = hw.family_compound || "";
    const displayType = resolveCompoundType(ctype);
    const components = parseComponents(construction, family);

    return {
      compoundType: displayType,
      construction,
      components,
    };
  }

  return null;
}
