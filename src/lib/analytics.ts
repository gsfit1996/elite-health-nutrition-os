import { logInfo } from "@/lib/logger"

export const ANALYTICS_EVENTS = {
  questionnaireCompleted: "questionnaire_completed",
  planQueued: "plan_queued",
  planReady: "plan_ready",
  checkInSaved: "checkin_saved",
} as const

export type AnalyticsEvent = typeof ANALYTICS_EVENTS[keyof typeof ANALYTICS_EVENTS]

export function trackEvent(event: AnalyticsEvent, metadata: Record<string, unknown> = {}): void {
  logInfo("analytics.event", { event, ...metadata })
}

