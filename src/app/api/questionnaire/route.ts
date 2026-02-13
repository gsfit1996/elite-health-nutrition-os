import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { questionnaireSchema } from "@/questionnaire/schema"

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const questionnaire = await prisma.questionnaire.findFirst({
      where: {
        userId: session.user.id,
        status: "active",
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ questionnaire })
  } catch (error) {
    console.error("Error fetching questionnaire:", error)
    return NextResponse.json(
      { error: "Failed to fetch questionnaire" },
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

    const body = await request.json()
    const { step, answers } = body

    // Validate the answers (partial validation for step saves)
    const partialSchema = questionnaireSchema.partial()
    const validatedAnswers = partialSchema.parse(answers)

    // Upsert the questionnaire
    const existingQuestionnaire = await prisma.questionnaire.findFirst({
      where: {
        userId: session.user.id,
        status: "active",
      },
    })

    if (existingQuestionnaire) {
      // Update existing
      const updated = await prisma.questionnaire.update({
        where: { id: existingQuestionnaire.id },
        data: {
          answers: {
            ...(existingQuestionnaire.answers as object),
            ...validatedAnswers,
          },
        },
      })
      return NextResponse.json({ questionnaire: updated })
    } else {
      // Create new
      const created = await prisma.questionnaire.create({
        data: {
          userId: session.user.id,
          answers: validatedAnswers,
          status: "active",
        },
      })
      return NextResponse.json({ questionnaire: created })
    }
  } catch (error) {
    console.error("Error saving questionnaire:", error)
    return NextResponse.json(
      { error: "Failed to save questionnaire" },
      { status: 500 }
    )
  }
}
