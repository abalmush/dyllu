const METALWORKING_TOOL_PATTERNS = [
  /^aparat de sudură(?:\s|$)/i,
  /^mașină de debitat metal(?:\s|$)/i,
  /^polizor drept(?:\s|$)/i,
  /^polizor unghiular(?:\s|$)/i,
  /^foarfece pentru tablă(?:\s|$)/i,
  /^clește de nituit manual(?:\s|$)/i,
  /^capsator și nituitor(?:\s|$)/i,
];

export function isMetalworkingTool(title: string): boolean {
  return METALWORKING_TOOL_PATTERNS.some((pattern) => pattern.test(title));
}
