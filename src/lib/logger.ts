type LogLevel = "info" | "warn" | "error"

type LogMeta = Record<string, unknown>

interface LogPayload {
  level: LogLevel
  message: string
  timestamp: string
  requestId?: string
  jobId?: string
  [key: string]: unknown
}

function formatError(error: unknown): LogMeta {
  if (error instanceof Error) {
    return {
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack,
    }
  }

  return {
    errorMessage: String(error),
  }
}

export function log(level: LogLevel, message: string, meta: LogMeta = {}): void {
  const payload: LogPayload = {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...meta,
  }

  const line = JSON.stringify(payload)

  if (level === "error") {
    console.error(line)
    return
  }

  if (level === "warn") {
    console.warn(line)
    return
  }

  console.log(line)
}

export function logInfo(message: string, meta?: LogMeta): void {
  log("info", message, meta)
}

export function logWarn(message: string, meta?: LogMeta): void {
  log("warn", message, meta)
}

export function logError(message: string, error: unknown, meta: LogMeta = {}): void {
  log("error", message, {
    ...meta,
    ...formatError(error),
  })
}

