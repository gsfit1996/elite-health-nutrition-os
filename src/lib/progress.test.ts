import { describe, expect, it } from "vitest"
import { calculateStreak, summarizeProgress } from "@/lib/progress"

describe("progress helpers", () => {
  it("calculates consecutive day streak", () => {
    const streak = calculateStreak(
      ["2026-02-11", "2026-02-12", "2026-02-13", "2026-02-09"],
      "2026-02-13"
    )
    expect(streak).toBe(3)
  })

  it("summarizes adherence and weight delta", () => {
    const summary = summarizeProgress(
      [
        { checkInDate: "2026-02-11", adherencePercent: 70, weightKg: 82.5 },
        { checkInDate: "2026-02-12", adherencePercent: 80, weightKg: 82.0 },
        { checkInDate: "2026-02-13", adherencePercent: 90, weightKg: 81.8 },
      ],
      "2026-02-13"
    )

    expect(summary.totalCheckIns).toBe(3)
    expect(summary.averageAdherencePercent).toBe(80)
    expect(summary.streakDays).toBe(3)
    expect(summary.weightDeltaKg).toBeCloseTo(-0.7, 1)
  })
})

