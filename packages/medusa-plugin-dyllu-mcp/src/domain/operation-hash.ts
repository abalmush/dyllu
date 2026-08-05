import { createHash } from "node:crypto";

import { OperationKind, OperationTargetType } from "./types";

export function createOperationHash(input: {
  kind: OperationKind;
  targetType: OperationTargetType;
  targetId: string | null;
  targetKey: string;
  targetVersion: string | null;
  beforeValue: Record<string, unknown>;
  proposedValue: Record<string, unknown>;
}) {
  const digest = createHash("sha256")
    .update(
      stableStringify({
        kind: input.kind,
        targetType: input.targetType,
        targetId: input.targetId,
        targetKey: input.targetKey,
        targetVersion: input.targetVersion,
        beforeValue: input.beforeValue,
        proposedValue: input.proposedValue,
      })
    )
    .digest("hex");
  return `sha256:${digest}`;
}

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) {
    return `[${value.map(stableStringify).join(",")}]`;
  }
  if (value && typeof value === "object") {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(
        ([key, entryValue]) =>
          `${JSON.stringify(key)}:${stableStringify(entryValue)}`
      );
    return `{${entries.join(",")}}`;
  }
  return JSON.stringify(value);
}
