import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { pollGammaStatus } from "@/lib/gamma"
import { logError } from "@/lib/logger"

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { planId } = await params
    const plan = await prisma.nutritionPlan.findUnique({
      where: { id: planId },
      include: {
        gammaGeneration: true,
      },
    })

    if (!plan) {
      return NextResponse.json({ error: "Plan not found" }, { status: 404 })
    }

    if (plan.userId !== session.user.id) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 })
    }

    let gammaStatus = plan.gammaGeneration?.status || null

    if (
      plan.gammaGeneration?.generationId &&
      (plan.gammaGeneration.status === "pending" || plan.gammaGeneration.status === "queued")
    ) {
      try {
        const polled = await pollGammaStatus(plan.gammaGeneration.generationId)
        const updatedGamma = await prisma.gammaGeneration.update({
          where: { nutritionPlanId: plan.id },
          data: {
            status: polled.status,
            gammaUrl: polled.gammaUrl,
            lastPayload: {
              generationId: polled.generationId,
              exportUrl: polled.exportUrl,
            },
            error: polled.error || null,
          },
        })
        gammaStatus = updatedGamma.status
      } catch (error) {
        logError("plan.status.gamma_poll_failed", error, {
          planId: plan.id,
        })
      }
    }

    return NextResponse.json({
      planId: plan.id,
      status: plan.status,
      gammaStatus,
      error: plan.error,
    })
  } catch (error) {
    logError("plan.status.failed", error)
    return NextResponse.json(
      { error: "Failed to fetch plan status" },
      { status: 500 }
    )
  }
}
