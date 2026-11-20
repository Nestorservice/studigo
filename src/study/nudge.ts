// Study reminders: the existing three daily slots (10:00, 15:00, 19:30) with
// a message that matches the moment. The scheduling itself stays in src/nudge.ts.
import { addDays } from "../progress";

export type StudyNudgeKey = "morning" | "afternoon" | "evening" | "streak" | "comeback";

/** Which reminder fits this slot: comeback after a gap, last call in the evening, streak pride, else time of day. */
export function studyNudgeKey(slot: number, streak: number, lastActive: string | null, day: string): StudyNudgeKey {
  if (streak === 0 && lastActive && lastActive < addDays(day, -1)) return "comeback";
  if (slot === 2 && streak > 0) return "evening";
  if (streak >= 7) return "streak";
  return slot === 0 ? "morning" : "afternoon";
}
