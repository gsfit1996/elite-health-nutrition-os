import { NextResponse } from "next/server"
import { getServerSession } from "next-auth"
import type { Prisma } from "@prisma/client"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { questionnaireSchema, QuestionnaireAnswers } from "@/questionnaire/schema"
import { calculateDerivedTargets } from "@/lib/derived-targets"
import { generateNutritionPlan, hashPrompt } from "@/lib/glm5"
import { startGammaGeneration } from "@/lib/gamma"

export async function POST() {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get the active questionnaire
    const questionnaire = await prisma.questionnaire.findFirst({
      where: {
        userId: session.user.id,
        status: "active",
      },
    })

    if (!questionnaire) {
      return NextResponse.json(
        { error: "No active questionnaire found. Please complete the questionnaire first." },
        { status: 400 }
      )
    }

    const answers = questionnaireSchema.parse(questionnaire.answers) as QuestionnaireAnswers

    // Calculate derived targets
    const derivedTargets = calculateDerivedTargets(answers)

    // Generate the nutrition plan using GLM-5
    const planResult = await generateNutritionPlan(answers, derivedTargets)

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
        title: `Elite Health Nutrition Plan - ${answers.firstName}`,
        markdown: planResult.markdown,
        derivedTargets: derivedTargets as unknown as Prisma.InputJsonValue,
        llmModel: "glm-4",
        llmPromptHash: hashPrompt(JSON.stringify(answers)),
      },
    })

    // Start Gamma generation asynchronously
    startGammaGenerationAsync(nutritionPlan.id, planResult.markdown)

    return NextResponse.json({
      success: true,
      plan: nutritionPlan,
      validation: planResult.validation,
      wasRepaired: planResult.wasRepaired,
    })
  } catch (error) {
    console.error("Error regenerating plan:", error)
    return NextResponse.json(
      { error: "Failed to regenerate plan", details: error instanceof Error ? error.message : "Unknown error" },
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
