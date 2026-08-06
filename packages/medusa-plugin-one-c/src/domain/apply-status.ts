export type AppliedChangeStatus = "applied" | "flagged" | "failed";

export type AppliedChangeRecord = {
  field: string;
  status: AppliedChangeStatus;
};

export type ItemApplyStatus = "not_applied" | "applied" | "flagged" | "failed";

export function deriveItemApplyStatus(
  records: AppliedChangeRecord[]
): ItemApplyStatus {
  if (records.length === 0) return "not_applied";
  if (records.some((record) => record.status === "failed")) return "failed";
  if (records.some((record) => record.status === "flagged")) return "flagged";
  return "applied";
}
