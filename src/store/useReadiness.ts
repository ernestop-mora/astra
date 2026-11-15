import { ACTIONS } from "@/data/home";
import { offlineCards } from "@/data/sensors";
import { readinessRange, readinessScore } from "@/lib/triage";
import { useAppStore } from "@/store/useAppStore";

function useInputs() {
  const readings = useAppStore((s) => s.readings);
  const completed = useAppStore((s) => s.completedActions);
  const fault = useAppStore((s) => s.sensorFault);
  const points = ACTIONS.filter((a) => completed.includes(a.id)).reduce((sum, a) => sum + a.points, 0);
  return { readings, points, offline: offlineCards(fault) };
}

/** Live readiness score from the shared store. Sensors with no signal are left out. */
export function useReadiness(): number {
  const { readings, points, offline } = useInputs();
  return readinessScore(readings, points, offline);
}

/** Score plus its uncertainty band when a sensor is offline. */
export function useReadinessDetail(): { score: number; range: { low: number; high: number } | null } {
  const { readings, points, offline } = useInputs();
  return { score: readinessScore(readings, points, offline), range: readinessRange(readings, points, offline) };
}
