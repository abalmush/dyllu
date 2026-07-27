const WOODWORKING_TOOL_PATTERNS = [
  /^ferăstrău circular(?:\s|$)/i,
  /^ferăstrău pendular(?:\s|$)/i,
  /^mașină de frezat(?:\s|$)/i,
  /^mașină de gravurat și șlefuit(?:\s|$)/i,
  /^mașină de șlefuit dreptunghiulară(?:\s|$)/i,
  /^mașină de șlefuit orbitală(?:\s|$)/i,
  /^rindea\b/i,
];

export function isWoodworkingTool(title: string): boolean {
  return WOODWORKING_TOOL_PATTERNS.some((pattern) => pattern.test(title));
}
