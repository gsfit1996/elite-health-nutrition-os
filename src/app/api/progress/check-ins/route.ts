import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { progressCheckInSchema, progressRangeQuerySchema } from "@/progress/schema"
import { ANALYTICS_EVENTS, trackEvent } from "@/lib/analytics"
import { logError } from "@/lib/logger"
import { featureFlags } from "@/lib/feature-flags"

function getDefaultDateRange(): { from: string; to: string } {
  const to = new Date()
  const from = new Date(to)
  from.setUTCDate(to.getUTCDate() - 29)

  return {
    from: from.toISOString().slice(0, 10),
    to: to.toISOString().slice(0, 10),
  }
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (!featureFlags.progressTracking) {
      return NextResponse.json({ error: "Progress tracking disabled" }, { status: 404 })
    }

    const params = request.nextUrl.searchParams
    const defaultRange = getDefaultDateRange()
    const from = params.get("from") || defaultRange.from
    const to = params.get("to") || defaultRange.to

    const parsed = progressRangeQuerySchema.safeParse({ from, to })
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid query range", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const history = await prisma.progressCheckIn.findMany({
      where: {
        userId: session.user.id,
        checkInDate: {
          gte: parsed.data.from,
          lte: parsed.data.to,
        },
      },
      orderBy: {
        checkInDate: "desc",
      },
    })

    return NextResponse.json({ checkIns: history })
  } catch (error) {
    logError("progress.checkins.get.failed", error)
    return NextResponse.json(
      { error: "Failed to fetch check-ins" },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (!featureFlags.progressTracking) {
      return NextResponse.json({ error: "Progress tracking disabled" }, { status: 404 })
    }

    const body = await request.json()
    const parsed = progressCheckInSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid check-in payload", details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    const checkIn = await prisma.progressCheckIn.upsert({
      where: {
        userId_checkInDate: {
          userId: session.user.id,
          checkInDate: parsed.data.checkInDate,
        },
      },
      create: {
        userId: session.user.id,
        checkInDate: parsed.data.checkInDate,
        timezone: parsed.data.timezone,
        weightKg: parsed.data.weightKg,
        adherencePercent: parsed.data.adherencePercent,
        notes: parsed.data.notes,
      },
      update: {
        timezone: parsed.data.timezone,
        weightKg: parsed.data.weightKg,
        adherencePercent: parsed.data.adherencePercent,
        notes: parsed.data.notes,
      },
    })

    trackEvent(ANALYTICS_EVENTS.checkInSaved, {
      userId: session.user.id,
      checkInDate: parsed.data.checkInDate,
      adherencePercent: parsed.data.adherencePercent,
    })

    return NextResponse.json({ checkIn })
  } catch (error) {
    logError("progress.checkins.post.failed", error)
    return NextResponse.json(
      { error: "Failed to save check-in" },
      { status: 500 }
    )
  }
}
