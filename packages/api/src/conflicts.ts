import { ApiError } from "./errors";

export function hasUpdatedAtConflict(
  currentUpdatedAt: string | null | undefined,
  expectedUpdatedAt: string | null | undefined,
) {
  return (currentUpdatedAt ?? null) !== (expectedUpdatedAt ?? null);
}

export function assertNoUpdatedAtConflict(params: {
  currentUpdatedAt: string | null | undefined;
  expectedUpdatedAt: string | null | undefined;
  conflictMessage: string;
}) {
  if (params.expectedUpdatedAt === undefined) {
    return;
  }

  if (hasUpdatedAtConflict(params.currentUpdatedAt, params.expectedUpdatedAt)) {
    throw ApiError.conflict(params.conflictMessage);
  }
}
