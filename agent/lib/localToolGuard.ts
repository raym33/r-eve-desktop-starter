import type { ToolContext } from "eve/tools";

const seenCalls = new Map<string, Set<string>>();

export type DuplicateToolCall = {
  answerGuidance: string;
  duplicateToolCall: true;
  ok: true;
  previousCallKey: string;
};

export function duplicateToolCallGuard(
  ctx: ToolContext,
  toolName: string,
  input: Record<string, unknown>,
): DuplicateToolCall | null {
  const turnKey = `${ctx.session.id}:${ctx.session.turn.sequence}`;
  const callKey = `${toolName}:${stableJson(input)}`;
  const calls = seenCalls.get(turnKey) ?? new Set<string>();

  if (calls.has(callKey)) {
    return {
      answerGuidance:
        "Duplicate tool call blocked. Do not call this tool again with the same input. Use the previous tool result and answer the user now.",
      duplicateToolCall: true,
      ok: true,
      previousCallKey: callKey,
    };
  }

  calls.add(callKey);
  seenCalls.set(turnKey, calls);
  pruneOldTurns(turnKey);
  return null;
}

function stableJson(value: unknown): string {
  return JSON.stringify(sortValue(value));
}

function sortValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortValue);
  }
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.entries(value as Record<string, unknown>)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([key, nested]) => [key, sortValue(nested)]),
    );
  }
  return value;
}

function pruneOldTurns(currentTurnKey: string) {
  if (seenCalls.size <= 100) {
    return;
  }
  for (const key of seenCalls.keys()) {
    if (key !== currentTurnKey) {
      seenCalls.delete(key);
    }
    if (seenCalls.size <= 50) {
      return;
    }
  }
}
