// מצב הריצה של מנוע הניוז - משותף בין נקודות ה-cron ל-/api/status.
// שני שלבים בלתי-תלויים: "plan" (כל 15 דק') ו-"write" (כל 2 דק'), כל אחד עם
// נעילה משלו. נשמר בזיכרון התהליך (מספיק לדרופלט עם תהליך Node יחיד ומתמשך).
import type { PlanResult, WriteResult } from "./engine";

export type PhaseName = "plan" | "write";

interface PhaseState<T> {
  isRunning: boolean;
  startedAt: number | null;
  lastFinishedAt: number | null;
  lastResult: T | null;
  lastError: string | null;
  lastErrorAt: number | null;
}

function emptyPhase<T>(): PhaseState<T> {
  return {
    isRunning: false,
    startedAt: null,
    lastFinishedAt: null,
    lastResult: null,
    lastError: null,
    lastErrorAt: null,
  };
}

const state: { plan: PhaseState<PlanResult>; write: PhaseState<WriteResult> } = {
  plan: emptyPhase<PlanResult>(),
  write: emptyPhase<WriteResult>(),
};

export function getRunState() {
  return state;
}

/** מנסה לתפוס את נעילת השלב. מחזיר false אם כבר רץ (יש לדלג). */
export function beginPhase(phase: PhaseName): boolean {
  if (state[phase].isRunning) return false;
  state[phase].isRunning = true;
  state[phase].startedAt = Date.now();
  return true;
}

export function endPhase(
  phase: PhaseName,
  result: PlanResult | WriteResult,
): void {
  if (phase === "plan") {
    state.plan.isRunning = false;
    state.plan.lastFinishedAt = Date.now();
    state.plan.lastResult = result as PlanResult;
  } else {
    state.write.isRunning = false;
    state.write.lastFinishedAt = Date.now();
    state.write.lastResult = result as WriteResult;
  }
}

export function failPhase(phase: PhaseName, err: unknown): void {
  const s = state[phase];
  s.isRunning = false;
  s.lastFinishedAt = Date.now();
  s.lastError = err instanceof Error ? err.message : String(err);
  s.lastErrorAt = Date.now();
}
