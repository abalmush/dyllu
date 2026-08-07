export type GuardrailInput = {
  currentValue: number | null;
  proposedValue: number | null;
};

export type GuardrailResult = "no_change" | "within_threshold" | "flagged";

export const DEFAULT_GUARDRAIL_THRESHOLD_PCT = 50;

export function evaluateGuardrail(
  input: GuardrailInput,
  thresholdPct: number = DEFAULT_GUARDRAIL_THRESHOLD_PCT
): GuardrailResult {
  const { currentValue, proposedValue } = input;
  if (proposedValue === null || proposedValue === currentValue) {
    return "no_change";
  }
  if (currentValue === null || currentValue === 0) {
    return "flagged";
  }
  const changePct =
    (Math.abs(proposedValue - currentValue) / currentValue) * 100;
  return changePct > thresholdPct ? "flagged" : "within_threshold";
}
