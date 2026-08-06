import { evaluateGuardrail } from "../guardrail";

describe("evaluateGuardrail", () => {
  it("reports no_change when values are identical", () => {
    expect(
      evaluateGuardrail({ currentValue: 100, proposedValue: 100 })
    ).toBe("no_change");
  });

  it("reports no_change when nothing is proposed", () => {
    expect(
      evaluateGuardrail({ currentValue: 100, proposedValue: null })
    ).toBe("no_change");
  });

  it("allows a change within the threshold", () => {
    expect(
      evaluateGuardrail({ currentValue: 100, proposedValue: 140 })
    ).toBe("within_threshold");
  });

  it("flags a change exceeding the threshold", () => {
    expect(
      evaluateGuardrail({ currentValue: 100, proposedValue: 160 })
    ).toBe("flagged");
  });

  it("flags exactly at the boundary as within_threshold (not exceeding)", () => {
    expect(
      evaluateGuardrail({ currentValue: 100, proposedValue: 150 })
    ).toBe("within_threshold");
  });

  it("flags any proposed value when current is zero", () => {
    expect(
      evaluateGuardrail({ currentValue: 0, proposedValue: 1 })
    ).toBe("flagged");
  });

  it("flags any proposed value when current is null", () => {
    expect(
      evaluateGuardrail({ currentValue: null, proposedValue: 500 })
    ).toBe("flagged");
  });

  it("respects a custom threshold", () => {
    expect(
      evaluateGuardrail({ currentValue: 100, proposedValue: 110 }, 5)
    ).toBe("flagged");
  });
});
