import { NextRequest, NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { questionnaireSchema, QuestionnaireAnswers } from "@/questionnaire/schema"
import { calculateDerivedTargets } from "@/lib/derived-targets"
import { generateNutritionPlan, hashPrompt } from "@/lib/glm5"
import { startGammaGeneration } from "@/lib/gamma"

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    
    // Validate the full questionnaire
    const validatedAnswers = questionnaireSchema.parse(body) as QuestionnaireAnswers

    // Calculate derived targets
    const derivedTargets = calculateDerivedTargets(validatedAnswers)

    // Archive any existing active questionnaires
    await prisma.questionnaire.updateMany({
      where: {
        userId: session.user.id,
        status: "active",
      },
      data: {
        status: "archived",
      },
    })

    // Create new active questionnaire
    const questionnaire = await prisma.questionnaire.create({
      data: {
        userId: session.user.id,
        answers: validatedAnswers,
        status: "active",
      },
    })

    // Generate the nutrition plan using GLM-5
    const planResult = await generateNutritionPlan(validatedAnswers, derivedTargets)

    // Get the latest plan version
    const latestPlan = await prisma.nutritionPlan.findFirst({
      where: { userId: session.user.id },
      orderBy: { version: "desc" },
    })

    const newVersion = (latestPlan?.version || 0) + 1

    // Create the nutrition plan
    const nutritionPlan = await prisma.nutritionPlan.create({
      data: {
        userId: session.user.id,
        questionnaireId: questionnaire.id,
        version: newVersion,
        title: `Elite Health Nutrition Plan - ${validatedAnswers.firstName}`,
        markdown: planResult.markdown,
        derivedTargets: derivedTargets,
        llmModel: "glm-4",
        llmPromptHash: hashPrompt(JSON.stringify(validatedAnswers)),
      },
    })

    // Start Gamma generation asynchronously (don't wait for it)
    startGammaGenerationAsync(nutritionPlan.id, planResult.markdown)

    return NextResponse.json({
      success: true,
      plan: nutritionPlan,
      validation: planResult.validation,
      wasRepaired: planResult.wasRepaired,
    })
  } catch (error) {
    console.error("Error completing questionnaire:", error)
    return NextResponse.json(
      { error: "Failed to generate plan", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 }
    )
  }
}

async function startGammaGenerationAsync(planId: string, markdown: string) {
  try {
    // Create GammaGeneration record
    await prisma.gammaGeneration.create({
      data: {
        nutritionPlanId: planId,
        status: "queued",
      },
    })

    // Start Gamma generation
    const gammaResult = await startGammaGeneration(markdown)

    // Update with generation ID
    await prisma.gammaGeneration.update({
      where: { nutritionPlanId: planId },
      data: {
        status: "pending",
        generationId: gammaResult.generationId,
      },
    })
  } catch (error) {
    console.error("Error starting Gamma generation:", error)
    
    // Update with error
    await prisma.gammaGeneration.update({
      where: { nutritionPlanId: planId },
      data: {
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
    })
  }
}
