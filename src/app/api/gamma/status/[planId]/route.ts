import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { pollGammaStatus } from "@/lib/gamma"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { planId } = await params

    // Get the gamma generation record
    const gammaGeneration = await prisma.gammaGeneration.findUnique({
      where: { nutritionPlanId: planId },
      include: {
        nutritionPlan: {
          select: { userId: true },
        },
      },
    })

    if (!gammaGeneration) {
      return NextResponse.json(
        { error: "Gamma generation not found" },
        { status: 404 }
      )
    }

    // Verify ownership
    if (gammaGeneration.nutritionPlan.userId !== session.user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 })
    }

    // If already completed or failed, return current status
    if (gammaGeneration.status === "completed" || gammaGeneration.status === "failed") {
      return NextResponse.json({ gammaGeneration })
    }

    // If no generation ID, return current status
    if (!gammaGeneration.generationId) {
      return NextResponse.json({ gammaGeneration })
    }

    // Poll Gamma API for status
    try {
      const gammaResult = await pollGammaStatus(gammaGeneration.generationId)

      // Update the record
      const updated = await prisma.gammaGeneration.update({
        where: { nutritionPlanId: planId },
        data: {
          status: gammaResult.status,
          gammaUrl: gammaResult.gammaUrl,
          lastPayload: {
            generationId: gammaResult.generationId,
            exportUrl: gammaResult.exportUrl,
          },
          error: gammaResult.error,
        },
      })

      return NextResponse.json({ gammaGeneration: updated })
    } catch (error) {
      console.error("Error polling Gamma status:", error)
      
      // Don't update status on poll error, just return current
      return NextResponse.json({ gammaGeneration })
    }
  } catch (error) {
    console.error("Error in Gamma status route:", error)
    return NextResponse.json(
      { error: "Failed to check Gamma status" },
      { status: 500 }
    )
  }
}
