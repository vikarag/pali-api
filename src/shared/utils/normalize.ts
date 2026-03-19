/**
 * Normalize Pali diacritical variants so that ṁ (dot above) and ṃ (dot below)
 * are treated as interchangeable. The DPD database uses ṃ (dot below),
 * so we normalize input to that form.
 */
export function normalizePali(input: string): string {
  return input.replaceAll("ṁ", "ṃ").replaceAll("Ṁ", "Ṃ");
}
