function envTrueByDefault(name: string): boolean {
  const value = process.env[name]
  if (!value) return true
  return value.toLowerCase() !== "false"
}

export const featureFlags = {
  asyncPlanPipeline: envTrueByDefault("FEATURE_ASYNC_PLAN_PIPELINE"),
  progressTracking: envTrueByDefault("FEATURE_PROGRESS_TRACKING"),
}

