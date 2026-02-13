import type { GenerationJob, Prisma } from "@prisma/client"
import { prisma } from "@/lib/prisma"
import { questionnaireSchema, QuestionnaireAnswers } from "@/questionnaire/schema"
import { calculateDerivedTargets } from "@/lib/derived-targets"
import { generateNutritionPlan, hashPrompt } from "@/lib/glm5"
import { startGammaGeneration } from "@/lib/gamma"
import { ANALYTICS_EVENTS, trackEvent } from "@/lib/analytics"
import { logError, logInfo, logWarn } from "@/lib/logger"

const PLAN_GENERATION_JOB_TYPE = "plan_generation"
const JOB_LEASE_MS = 60_000

type PlanGenerationTrigger = "questionnaire_complete" | "regenerate"

interface PlanGenerationPayload {
  planId: string
  questionnaireId: string
  questionnaireVersion: number
  trigger: PlanGenerationTrigger
}

export interface JobRunSummary {
  claimed: number
  completed: number
  retried: number
  failed: number
}

function parsePayload(payload: unknown): PlanGenerationPayload {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid generation job payload")
  }

  const value = payload as Record<string, unknown>
  const planId = value.planId
  const questionnaireId = value.questionnaireId
  const questionnaireVersion = value.questionnaireVersion
  const trigger = value.trigger

  if (typeof planId !== "string" || typeof questionnaireId !== "string") {
    throw new Error("Generation job payload is missing identifiers")
  }

  if (typeof questionnaireVersion !== "number") {
    throw new Error("Generation job payload is missing questionnaireVersion")
  }

  if (trigger !== "questionnaire_complete" && trigger !== "regenerate") {
    throw new Error("Generation job payload contains invalid trigger")
  }

  return {
    planId,
    questionnaireId,
    questionnaireVersion,
    trigger,
  }
}

export function buildPlanJobKey(input: {
  userId: string
  questionnaireVersion: number
  planId: string
}): string {
  return `${PLAN_GENERATION_JOB_TYPE}:${input.userId}:${input.questionnaireVersion}:${input.planId}`
}

export async function enqueuePlanGenerationJob(input: {
  userId: string
  planId: string
  questionnaireId: string
  questionnaireVersion: number
  trigger: PlanGenerationTrigger
  maxAttempts?: number
}) {
  const payload: PlanGenerationPayload = {
    planId: input.planId,
    questionnaireId: input.questionnaireId,
    questionnaireVersion: input.questionnaireVersion,
    trigger: input.trigger,
  }

  const jobKey = buildPlanJobKey({
    userId: input.userId,
    questionnaireVersion: input.questionnaireVersion,
    planId: input.planId,
  })

  try {
    return await prisma.generationJob.create({
      data: {
        jobKey,
        type: PLAN_GENERATION_JOB_TYPE,
        status: "queued",
        payload: payload as unknown as Prisma.InputJsonValue,
        attempts: 0,
        maxAttempts: input.maxAttempts ?? 5,
        userId: input.userId,
        nutritionPlanId: input.planId,
      },
    })
  } catch (error) {
    const maybeCode =
      typeof error === "object" && error !== null && "code" in error
        ? String((error as { code?: unknown }).code)
        : ""

    if (maybeCode === "P2002") {
      const existing = await prisma.generationJob.findUnique({
        where: { jobKey },
      })
      if (existing) return existing
    }

    throw error
  }
}

async function runPlanGeneration(payload: PlanGenerationPayload, job: GenerationJob): Promise<void> {
  const nutritionPlan = await prisma.nutritionPlan.findUnique({
    where: { id: payload.planId },
    include: {
      questionnaire: true,
    },
  })

  if (!nutritionPlan) {
    throw new Error(`Plan ${payload.planId} not found`)
  }

  if (nutritionPlan.status === "ready") {
    logInfo("job.plan_generation.skipped_ready", {
      jobId: job.id,
      planId: nutritionPlan.id,
    })
    return
  }

  const parsedAnswers = questionnaireSchema.parse(
    nutritionPlan.questionnaire.answers
  ) as QuestionnaireAnswers
  const derivedTargets = calculateDerivedTargets(parsedAnswers)
  const generation = await generateNutritionPlan(parsedAnswers, derivedTargets)
  const promptHash = hashPrompt(JSON.stringify(parsedAnswers))

  await prisma.nutritionPlan.update({
    where: { id: nutritionPlan.id },
    data: {
      status: "ready",
      markdown: generation.markdown,
      derivedTargets: derivedTargets as unknown as Prisma.InputJsonValue,
      llmModel: process.env.GLM_5_MODEL || "glm-4",
      llmPromptHash: promptHash,
      error: null,
      validationIssues: generation.validation.issues as unknown as Prisma.InputJsonValue,
    },
  })

  trackEvent(ANALYTICS_EVENTS.planReady, {
    userId: nutritionPlan.userId,
    planId: nutritionPlan.id,
    wasRepaired: generation.wasRepaired,
  })

  await prisma.gammaGeneration.upsert({
    where: { nutritionPlanId: nutritionPlan.id },
    create: {
      nutritionPlanId: nutritionPlan.id,
      status: "queued",
    },
    update: {
      status: "queued",
      error: null,
    },
  })

  try {
    const gammaResult = await startGammaGeneration(generation.markdown)

    await prisma.gammaGeneration.update({
      where: { nutritionPlanId: nutritionPlan.id },
      data: {
        status: "pending",
        generationId: gammaResult.generationId,
        gammaUrl: gammaResult.gammaUrl,
        lastPayload: {
          generationId: gammaResult.generationId,
          exportUrl: gammaResult.exportUrl,
        },
        error: gammaResult.error || null,
      },
    })
  } catch (error) {
    logError("job.plan_generation.gamma_failed", error, {
      jobId: job.id,
      planId: nutritionPlan.id,
    })

    await prisma.gammaGeneration.update({
      where: { nutritionPlanId: nutritionPlan.id },
      data: {
        status: "failed",
        error: error instanceof Error ? error.message : "Unknown error",
      },
    })
  }
}

async function markPlanFailed(planId: string | null, errorMessage: string): Promise<void> {
  if (!planId) return

  await prisma.nutritionPlan.update({
    where: { id: planId },
    data: {
      status: "failed",
      error: errorMessage,
    },
  })
}

function getRetryDelayMs(attempt: number): number {
  const baseMs = 60_000
  return baseMs * 2 ** Math.max(0, attempt - 1)
}

async function runJob(job: GenerationJob): Promise<"completed" | "retried" | "failed"> {
  try {
    if (job.type !== PLAN_GENERATION_JOB_TYPE) {
      logWarn("job.unknown_type", { jobId: job.id, type: job.type })
      await prisma.generationJob.update({
        where: { id: job.id },
        data: {
          status: "failed",
          lastError: `Unsupported job type: ${job.type}`,
          leaseUntil: null,
        },
      })
      return "failed"
    }

    const payload = parsePayload(job.payload)
    await runPlanGeneration(payload, job)

    await prisma.generationJob.update({
      where: { id: job.id },
      data: {
        status: "completed",
        leaseUntil: null,
        lastError: null,
      },
    })

    return "completed"
  } catch (error) {
    logError("job.execution_failed", error, { jobId: job.id })

    const refreshed = await prisma.generationJob.findUnique({
      where: { id: job.id },
    })
    const attempts = refreshed?.attempts ?? job.attempts
    const errorMessage = error instanceof Error ? error.message : "Unknown error"

    if (attempts >= job.maxAttempts) {
      await prisma.generationJob.update({
        where: { id: job.id },
        data: {
          status: "failed",
          leaseUntil: null,
          lastError: errorMessage,
        },
      })
      await markPlanFailed(job.nutritionPlanId, errorMessage)
      return "failed"
    }

    const retryDelayMs = getRetryDelayMs(attempts)
    await prisma.generationJob.update({
      where: { id: job.id },
      data: {
        status: "retryable",
        leaseUntil: null,
        runAfter: new Date(Date.now() + retryDelayMs),
        lastError: errorMessage,
      },
    })

    return "retried"
  }
}

async function claimJobs(maxJobs: number): Promise<GenerationJob[]> {
  const now = new Date()
  const availableJobs = await prisma.generationJob.findMany({
    where: {
      status: {
        in: ["queued", "retryable"],
      },
      runAfter: {
        lte: now,
      },
      OR: [{ leaseUntil: null }, { leaseUntil: { lt: now } }],
    },
    orderBy: {
      createdAt: "asc",
    },
    take: maxJobs,
  })

  const claimed: GenerationJob[] = []
  for (const job of availableJobs) {
    const claimedCount = await prisma.generationJob.updateMany({
      where: {
        id: job.id,
        status: {
          in: ["queued", "retryable"],
        },
        runAfter: {
          lte: new Date(),
        },
        OR: [{ leaseUntil: null }, { leaseUntil: { lt: new Date() } }],
      },
      data: {
        status: "running",
        attempts: {
          increment: 1,
        },
        leaseUntil: new Date(Date.now() + JOB_LEASE_MS),
      },
    })

    if (claimedCount.count === 0) {
      continue
    }

    const lockedJob = await prisma.generationJob.findUnique({
      where: { id: job.id },
    })
    if (lockedJob) {
      claimed.push(lockedJob)
    }
  }

  return claimed
}

export async function runGenerationJobs(maxJobs: number = 3): Promise<JobRunSummary> {
  const claimedJobs = await claimJobs(maxJobs)
  const summary: JobRunSummary = {
    claimed: claimedJobs.length,
    completed: 0,
    retried: 0,
    failed: 0,
  }

  for (const job of claimedJobs) {
    const result = await runJob(job)
    if (result === "completed") summary.completed += 1
    if (result === "retried") summary.retried += 1
    if (result === "failed") summary.failed += 1
  }

  return summary
}
