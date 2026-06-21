// מצב הריצה האחרון של מנוע הניוז - משותף בין /api/refresh ל-/api/status.
// נשמר בזיכרון התהליך (מספיק לדרופלט עם תהליך Node יחיד ומתמשך).
import type { RefreshResult } from "./engine";

interface RunState {
  isRunning: boolean;
  startedAt: number | null;
  lastFinishedAt: number | null;
  lastResult: RefreshResult | null;
  lastError: string | null;
  lastErrorAt: number | null;
}

const state: RunState = {
  isRunning: false,
  startedAt: null,
  lastFinishedAt: null,
  lastResult: null,
  lastError: null,
  lastErrorAt: null,
};

export function getRunState(): Readonly<RunState> {
  return state;
}

export function markRunStart(): void {
  state.isRunning = true;
  state.startedAt = Date.now();
}

export function markRunDone(result: RefreshResult): void {
  state.isRunning = false;
  state.lastFinishedAt = Date.now();
  state.lastResult = result;
}

export function markRunError(err: unknown): void {
  state.isRunning = false;
  state.lastFinishedAt = Date.now();
  state.lastError = err instanceof Error ? err.message : String(err);
  state.lastErrorAt = Date.now();
}
