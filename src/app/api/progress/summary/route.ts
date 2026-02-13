import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { summarizeProgress } from "@/lib/progress"
import { logError } from "@/lib/logger"
import { featureFlags } from "@/lib/feature-flags"

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
    if (!featureFlags.progressTracking) {
      return NextResponse.json({ error: "Progress tracking disabled" }, { status: 404 })
    }

    const toParam = request.nextUrl.searchParams.get("to")
    const to = toParam && /^\d{4}-\d{2}-\d{2}$/.test(toParam)
      ? toParam
      : new Date().toISOString().slice(0, 10)

    const fromDate = new Date(`${to}T00:00:00.000Z`)
    fromDate.setUTCDate(fromDate.getUTCDate() - 29)
    const from = fromDate.toISOString().slice(0, 10)

    const history = await prisma.progressCheckIn.findMany({
      where: {
        userId: session.user.id,
        checkInDate: {
          gte: from,
          lte: to,
        },
      },
      orderBy: {
        checkInDate: "asc",
      },
      select: {
        checkInDate: true,
        adherencePercent: true,
        weightKg: true,
      },
    })

    const summary = summarizeProgress(history, to)

    return NextResponse.json({
      summary,
      range: { from, to },
    })
  } catch (error) {
    logError("progress.summary.get.failed", error)
    return NextResponse.json(
      { error: "Failed to load progress summary" },
      { status: 500 }
    )
  }
}
