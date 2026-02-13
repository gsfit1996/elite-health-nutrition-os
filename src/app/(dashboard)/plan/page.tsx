"use client"

import { Suspense, useCallback, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { useSession } from "next-auth/react"
import ReactMarkdown from "react-markdown"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { DerivedTargets as DerivedTargetsType } from "@/lib/derived-targets"

interface GammaGeneration {
  id: string
  status: string
  generationId: string | null
  gammaUrl: string | null
  error: string | null
}

interface NutritionPlan {
  id: string
  version: number
  title: string
  status: "generating" | "ready" | "failed"
  error: string | null
  markdown: string | null
  derivedTargets: DerivedTargetsType
  createdAt: string
  gammaGeneration: GammaGeneration | null
}

function PlanPageContent() {
  const { status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()

  const [plan, setPlan] = useState<NutritionPlan | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRegenerating, setIsRegenerating] = useState(false)

  const isGeneratingQuery = searchParams.get("generating") === "true"
  const shouldPoll = useMemo(
    () =>
      plan?.status === "generating" ||
      plan?.gammaGeneration?.status === "queued" ||
      plan?.gammaGeneration?.status === "pending",
    [plan?.status, plan?.gammaGeneration?.status]
  )

  const fetchPlan = useCallback(async () => {
    const response = await fetch("/api/plan")
    if (response.ok) {
      const data = await response.json()
      setPlan(data.plan)
      return
    }

    if (response.status === 404 && !isGeneratingQuery) {
      router.push("/questionnaire")
      return
    }
  }, [isGeneratingQuery, router])

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
      return
    }
    if (status !== "authenticated") return

    fetchPlan()
      .catch(() => {
        toast({
          title: "Error",
          description: "Failed to load plan.",
          variant: "destructive",
        })
      })
      .finally(() => setIsLoading(false))
  }, [status, router, toast, fetchPlan])

  useEffect(() => {
    if (!plan || !shouldPoll) return

    const interval = setInterval(async () => {
      const statusResponse = await fetch(`/api/plan/status/${plan.id}`)
      if (!statusResponse.ok) {
        return
      }

      const payload = await statusResponse.json()
      if (payload.status !== plan.status || payload.gammaStatus !== plan.gammaGeneration?.status) {
        await fetchPlan()
      }
    }, 5000)

    return () => clearInterval(interval)
  }, [plan, shouldPoll, fetchPlan])

  async function handleRegenerate() {
    if (!confirm("Are you sure you want to regenerate your plan? This creates a new version.")) {
      return
    }

    setIsRegenerating(true)
    try {
      const response = await fetch("/api/plan/regenerate", { method: "POST" })
      if (!response.ok) {
        throw new Error("Regenerate failed")
      }

      const payload = await response.json()
      toast({
        title: "Plan queued",
        description: "A new plan version is being generated.",
      })

      router.push(`/plan?generating=true&planId=${payload.planId}`)
      await fetchPlan()
    } catch {
      toast({
        title: "Error",
        description: "Could not regenerate your plan.",
        variant: "destructive",
      })
    } finally {
      setIsRegenerating(false)
    }
  }

  function getGammaStatusBadge(currentStatus: string) {
    switch (currentStatus) {
      case "completed":
        return <Badge className="bg-green-600">Ready</Badge>
      case "pending":
      case "queued":
        return <Badge variant="secondary">Processing</Badge>
      case "failed":
        return <Badge variant="destructive">Failed</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  function getPlanStatusBadge(currentStatus: NutritionPlan["status"]) {
    switch (currentStatus) {
      case "ready":
        return <Badge className="bg-green-600">Ready</Badge>
      case "generating":
        return <Badge variant="secondary">Generating</Badge>
      case "failed":
        return <Badge variant="destructive">Failed</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  if (isLoading || status !== "authenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-green-600" />
          <p className="mt-4 text-gray-600">Loading your plan...</p>
        </div>
      </div>
    )
  }

  if (!plan) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>No Plan Yet</CardTitle>
            <CardDescription>
              Complete the questionnaire to generate your personalized nutrition plan.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/questionnaire")}>Start Questionnaire</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const targets = plan.derivedTargets as DerivedTargetsType

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-600">
              <span className="text-xl font-bold text-white">E</span>
            </div>
            <span className="text-xl font-bold text-gray-900">Elite Health</span>
          </div>
          <Button variant="outline" onClick={() => router.push("/dashboard")}>
            Dashboard
          </Button>
        </header>

        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Plan Status</CardTitle>
                <CardDescription>Current generation state for version {plan.version}</CardDescription>
              </div>
              {getPlanStatusBadge(plan.status)}
            </div>
          </CardHeader>
          <CardContent>
            {plan.status === "generating" && (
              <p className="text-gray-600">
                Your plan is queued or generating. This page refreshes automatically.
              </p>
            )}
            {plan.status === "failed" && (
              <p className="text-red-600">
                Plan generation failed: {plan.error || "Unknown error"}
              </p>
            )}
            {plan.status === "ready" && (
              <p className="text-green-700">Plan is ready. Review and export below.</p>
            )}
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Your Daily Targets</CardTitle>
            <CardDescription>Based on your stats and goals</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <div className="rounded-lg bg-green-50 p-4 text-center">
                <p className="text-sm text-gray-600">Protein</p>
                <p className="text-2xl font-bold text-green-600">
                  {targets.proteinMin}-{targets.proteinMax}g
                </p>
              </div>
              <div className="rounded-lg bg-blue-50 p-4 text-center">
                <p className="text-sm text-gray-600">Calories</p>
                <p className="text-2xl font-bold text-blue-600">~{targets.caloriesPerDay}</p>
              </div>
              <div className="rounded-lg bg-purple-50 p-4 text-center">
                <p className="text-sm text-gray-600">Goal Mode</p>
                <p className="text-lg font-bold capitalize text-purple-600">
                  {targets.goalMode.replace("_", " ")}
                </p>
              </div>
              <div className="rounded-lg bg-orange-50 p-4 text-center">
                <p className="text-sm text-gray-600">Version</p>
                <p className="text-2xl font-bold text-orange-600">v{plan.version}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {plan.gammaGeneration && (
          <Card className="mb-8">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Export Status</CardTitle>
                  <CardDescription>Gamma document generation</CardDescription>
                </div>
                {getGammaStatusBadge(plan.gammaGeneration.status)}
              </div>
            </CardHeader>
            <CardContent>
              {plan.gammaGeneration.status === "completed" && plan.gammaGeneration.gammaUrl && (
                <a
                  href={plan.gammaGeneration.gammaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button>Open in Gamma</Button>
                </a>
              )}
              {plan.gammaGeneration.status === "pending" && (
                <p className="text-gray-600">Export is in progress. It usually completes in 1-2 minutes.</p>
              )}
              {plan.gammaGeneration.status === "failed" && (
                <p className="text-red-600">
                  Export failed: {plan.gammaGeneration.error || "Unknown error"}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        <div className="mb-8 flex gap-4">
          <Button variant="outline" onClick={handleRegenerate} disabled={isRegenerating}>
            {isRegenerating ? "Regenerating..." : "Regenerate Plan"}
          </Button>
          <Button variant="outline" onClick={() => router.push("/questionnaire")}>
            Edit Questionnaire
          </Button>
          <Button variant="outline" onClick={() => router.push("/progress")}>
            Open Progress
          </Button>
        </div>

        <Card>
          <CardContent className="pt-6">
            {plan.status !== "ready" || !plan.markdown ? (
              <p className="text-gray-600">
                Plan content will appear here when generation completes.
              </p>
            ) : (
              <div className="prose prose-green max-w-none">
                <ReactMarkdown>{plan.markdown}</ReactMarkdown>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function LoadingFallback() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-green-600" />
        <p className="mt-4 text-gray-600">Loading your plan...</p>
      </div>
    </div>
  )
}

export default function PlanPage() {
  return (
    <Suspense fallback={<LoadingFallback />}>
      <PlanPageContent />
    </Suspense>
  )
}
