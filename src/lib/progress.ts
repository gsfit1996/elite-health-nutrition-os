interface ProgressSeriesItem {
  checkInDate: string
  adherencePercent: number
  weightKg: number | null
}

export interface ProgressSummary {
  totalCheckIns: number
  averageAdherencePercent: number
  streakDays: number
  weightDeltaKg: number | null
}

function toDateValue(dateString: string): number {
  return Date.parse(`${dateString}T00:00:00.000Z`)
}

export function calculateStreak(checkInDates: string[], todayDate: string): number {
  if (checkInDates.length === 0) return 0

  const dateSet = new Set(checkInDates)
  let streak = 0
  const cursor = new Date(`${todayDate}T00:00:00.000Z`)

  while (dateSet.has(cursor.toISOString().slice(0, 10))) {
    streak += 1
    cursor.setUTCDate(cursor.getUTCDate() - 1)
  }

  return streak
}

export function summarizeProgress(
  history: ProgressSeriesItem[],
  todayDate: string
): ProgressSummary {
  if (history.length === 0) {
    return {
      totalCheckIns: 0,
      averageAdherencePercent: 0,
      streakDays: 0,
      weightDeltaKg: null,
    }
  }

  const sortedByDateAsc = [...history].sort(
    (a, b) => toDateValue(a.checkInDate) - toDateValue(b.checkInDate)
  )
  const totalAdherence = history.reduce((acc, item) => acc + item.adherencePercent, 0)

  const weights = sortedByDateAsc.filter((item) => typeof item.weightKg === "number")
  const weightDeltaKg =
    weights.length >= 2
      ? Number((weights[weights.length - 1].weightKg! - weights[0].weightKg!).toFixed(1))
      : null

  return {
    totalCheckIns: history.length,
    averageAdherencePercent: Math.round(totalAdherence / history.length),
    streakDays: calculateStreak(
      history.map((item) => item.checkInDate),
      todayDate
    ),
    weightDeltaKg,
  }
}

