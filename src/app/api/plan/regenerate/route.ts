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

const ROUTE_ID = "POST /api/plan/regenerate"

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

    const activeQuestionnaire = await prisma.questionnaire.findFirst({
      where: {
        userId,
        status: "active",
      },
      orderBy: {
        version: "desc",
      },
    })

    if (!activeQuestionnaire) {
      return NextResponse.json(
        { error: "No active questionnaire found. Please complete the questionnaire first." },
        { status: 400 }
      )
    }

    const answers = questionnaireSchema.parse(activeQuestionnaire.answers) as QuestionnaireAnswers
    const derivedTargets = calculateDerivedTargets(answers)

    const latestPlan = await prisma.nutritionPlan.findFirst({
      where: { userId },
      orderBy: { version: "desc" },
      select: { version: true },
    })

    const nutritionPlan = await prisma.nutritionPlan.create({
      data: {
        userId,
        questionnaireId: activeQuestionnaire.id,
        version: (latestPlan?.version || 0) + 1,
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

    const job = await enqueuePlanGenerationJob({
      userId,
      planId: nutritionPlan.id,
      questionnaireId: activeQuestionnaire.id,
      questionnaireVersion: activeQuestionnaire.version,
      trigger: "regenerate",
      maxAttempts: 5,
    })

    trackEvent(ANALYTICS_EVENTS.planQueued, {
      userId,
      planId: nutritionPlan.id,
      jobId: job.id,
      requestId,
      source: "regenerate",
    })

    logInfo("plan.regenerate.queued", {
      requestId,
      userId,
      planId: nutritionPlan.id,
      jobId: job.id,
    })

    return NextResponse.json(
      {
        success: true,
        planId: nutritionPlan.id,
        jobId: job.id,
        status: "queued",
      },
      { status: 202 }
    )
  } catch (error) {
    logError("plan.regenerate.failed", error, { requestId })
    return NextResponse.json(
      {
        error: "Failed to regenerate plan",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    )
  }
}
