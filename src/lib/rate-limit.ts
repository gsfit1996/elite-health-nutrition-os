import { prisma } from "@/lib/prisma"

export interface RateLimitOptions {
  route: string
  userId?: string
  limit: number
  windowSeconds: number
}

export interface RateLimitResult {
  allowed: boolean
  limit: number
  remaining: number
  resetAt: string
}

function getWindowStart(windowSeconds: number): Date {
  const now = Date.now()
  const bucket = Math.floor(now / (windowSeconds * 1000)) * (windowSeconds * 1000)
  return new Date(bucket)
}

export async function checkRateLimit(options: RateLimitOptions): Promise<RateLimitResult> {
  const windowStart = getWindowStart(options.windowSeconds)
  const identity = options.userId ?? "anonymous"
  const key = `${options.route}:${identity}:${windowStart.toISOString()}:${options.windowSeconds}`

  const entry = await prisma.apiRateLimit.upsert({
    where: { key },
    create: {
      key,
      route: options.route,
      userId: options.userId,
      windowStart,
      windowSeconds: options.windowSeconds,
      count: 1,
    },
    update: {
      count: {
        increment: 1,
      },
    },
  })

  const remaining = Math.max(0, options.limit - entry.count)
  const allowed = entry.count <= options.limit
  const resetAt = new Date(windowStart.getTime() + options.windowSeconds * 1000).toISOString()

  return {
    allowed,
    limit: options.limit,
    remaining,
    resetAt,
  }
}

