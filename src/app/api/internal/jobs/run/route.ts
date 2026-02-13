import { NextRequest, NextResponse } from "next/server"
import { runGenerationJobs } from "@/lib/jobs/generation"
import { logError, logInfo } from "@/lib/logger"

function isAuthorized(request: NextRequest): boolean {
  const bearerToken = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "")
  const internalHeader = request.headers.get("x-internal-job-secret")
  const expected = process.env.INTERNAL_JOB_SECRET || process.env.CRON_SECRET

  if (!expected) return false

  return bearerToken === expected || internalHeader === expected
}

async function handleRun(request: NextRequest) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const maxJobs = Number(request.nextUrl.searchParams.get("maxJobs") || "3")

  try {
    const summary = await runGenerationJobs(Math.max(1, Math.min(20, maxJobs)))
    logInfo("jobs.run.completed", { ...summary })
    return NextResponse.json({ ok: true, summary })
  } catch (error) {
    logError("jobs.run.failed", error)
    return NextResponse.json({ error: "Job run failed" }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  return handleRun(request)
}

export async function POST(request: NextRequest) {
  return handleRun(request)
}
