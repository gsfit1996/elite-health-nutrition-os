import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const plan = await prisma.nutritionPlan.findFirst({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      include: {
        gammaGeneration: true,
      },
    })

    if (!plan) {
      return NextResponse.json({ error: "No plan found" }, { status: 404 })
    }

    return NextResponse.json({ plan })
  } catch (error) {
    console.error("Error fetching plan:", error)
    return NextResponse.json(
      { error: "Failed to fetch plan" },
      { status: 500 }
    )
  }
}
