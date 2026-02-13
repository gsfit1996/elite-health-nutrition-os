import { randomUUID } from "crypto"
import { NextRequest, NextResponse } from "next/server"
import type { Prisma } from "@prisma/client"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { questionnaireSchema, QuestionnaireAnswers } from "@/questionnaire/schema"
import { calculateDerivedTargets } from "@/lib/derived-targets"
import { hashPrompt } from "@/lib/glm5"
import { enqueuePlanGenerationJob } from "@/lib/jobs/generation"
import { checkRateLimit } from "@/lib/rate-limit"
import { ANALYTICS_EVENTS, trackEvent } from "@/lib/analytics"
import { logError, logInfo } from "@/lib/logger"
import { featureFlags } from "@/lib/feature-flags"

const ROUTE_ID = "POST /api/questionnaire/complete"

export async function POST(request: NextRequest) {
  const requestId = request.headers.get("x-request-id") || randomUUID()

  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userId = session.user.id
    if (!featureFlags.asyncPlanPipeline) {
      return NextResponse.json(
        { error: "Async plan pipeline is disabled" },
        { status: 503 }
      )
    }

    const rateLimit = await checkRateLimit({
      route: ROUTE_ID,
      userId,
      limit: 5,
      windowSeconds: 300,
    })

    if (!rateLimit.allowed) {
      return NextResponse.json(
        {
          error: "Rate limit exceeded",
          limit: rateLimit.limit,
          remaining: rateLimit.remaining,
          resetAt: rateLimit.resetAt,
        },
        { status: 429 }
      )
    }

    const payload = await request.json()
    const answers = questionnaireSchema.parse(payload) as QuestionnaireAnswers
    const derivedTargets = calculateDerivedTargets(answers)

    const result = await prisma.$transaction(async (tx) => {
      const latestQuestionnaire = await tx.questionnaire.findFirst({
        where: { userId },
        orderBy: { version: "desc" },
        select: { version: true },
      })

      const latestPlan = await tx.nutritionPlan.findFirst({
        where: { userId },
        orderBy: { version: "desc" },
        select: { version: true },
      })

      await tx.questionnaire.updateMany({
        where: {
          userId,
          status: "active",
        },
        data: {
          status: "archived",
        },
      })

      const questionnaireVersion = (latestQuestionnaire?.version || 0) + 1
      const questionnaire = await tx.questionnaire.create({
        data: {
          userId,
          version: questionnaireVersion,
          answers,
          status: "active",
        },
      })

      const planVersion = (latestPlan?.version || 0) + 1
      const nutritionPlan = await tx.nutritionPlan.create({
        data: {
          userId,
          questionnaireId: questionnaire.id,
          version: planVersion,
          title: `Elite Health Nutrition Plan - ${answers.firstName}`,
          status: "generating",
          markdown: null,
          derivedTargets: derivedTargets as unknown as Prisma.InputJsonValue,
          llmModel: process.env.GLM_5_MODEL || "glm-4",
          llmPromptHash: hashPrompt(JSON.stringify(answers)),
          error: null,
          validationIssues: [] as unknown as Prisma.InputJsonValue,
        },
      })

      return {
        questionnaireId: questionnaire.id,
        questionnaireVersion: questionnaire.version,
        planId: nutritionPlan.id,
      }
    })

    const job = await enqueuePlanGenerationJob({
      userId,
      planId: result.planId,
      questionnaireId: result.questionnaireId,
      questionnaireVersion: result.questionnaireVersion,
      trigger: "questionnaire_complete",
      maxAttempts: 5,
    })

    trackEvent(ANALYTICS_EVENTS.questionnaireCompleted, {
      userId,
      planId: result.planId,
      requestId,
    })
    trackEvent(ANALYTICS_EVENTS.planQueued, {
      userId,
      planId: result.planId,
      jobId: job.id,
      requestId,
    })

    logInfo("questionnaire.complete.queued", {
      requestId,
      userId,
      planId: result.planId,
      jobId: job.id,
    })

    return NextResponse.json(
      {
        success: true,
        planId: result.planId,
        jobId: job.id,
        status: "queued",
      },
      { status: 202 }
    )
  } catch (error) {
    logError("questionnaire.complete.failed", error, { requestId })
    return NextResponse.json(
      {
        error: "Failed to queue plan generation",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
