"use client"

import { useState, useEffect } from "react"
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
  markdown: string
  derivedTargets: DerivedTargetsType
  createdAt: string
  gammaGeneration: GammaGeneration | null
}

export default function PlanPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const searchParams = useSearchParams()
  const { toast } = useToast()
  const [plan, setPlan] = useState<NutritionPlan | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRegenerating, setIsRegenerating] = useState(false)
  const [pollInterval, setPollInterval] = useState<NodeJS.Timeout | null>(null)

  const isGenerating = searchParams.get("generating") === "true"

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
      return
    }

    if (status !== "authenticated") return

    fetchPlan()
  }, [status, router])

  // Poll for Gamma status updates
  useEffect(() => {
    if (plan?.gammaGeneration?.status === "pending" || plan?.gammaGeneration?.status === "queued") {
      const interval = setInterval(async () => {
        try {
          const response = await fetch(`/api/gamma/status/${plan.id}`)
          if (response.ok) {
            const data = await response.json()
            if (data.gammaGeneration) {
              setPlan((prev) => {
                if (!prev) return prev
                return {
                  ...prev,
                  gammaGeneration: data.gammaGeneration,
                }
              })

              // Stop polling if completed or failed
              if (data.gammaGeneration.status === "completed" || data.gammaGeneration.status === "failed") {
                clearInterval(interval)
                setPollInterval(null)
              }
            }
          }
        } catch (error) {
          console.error("Error polling Gamma status:", error)
        }
      }, 5000)

      setPollInterval(interval)

      return () => {
        clearInterval(interval)
      }
    }
  }, [plan?.gammaGeneration?.status])

  async function fetchPlan() {
    try {
      const response = await fetch("/api/plan")
      if (response.ok) {
        const data = await response.json()
        setPlan(data.plan)
      } else if (response.status === 404) {
        // No plan yet
        if (!isGenerating) {
          router.push("/questionnaire")
        }
      }
    } catch (error) {
      console.error("Error fetching plan:", error)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleRegenerate() {
    if (!confirm("Are you sure you want to regenerate your plan? This will create a new version.")) {
      return
    }

    setIsRegenerating(true)

    try {
      const response = await fetch("/api/plan/regenerate", {
        method: "POST",
      })

      if (response.ok) {
        toast({
          title: "Plan regenerated!",
          description: "Your new plan is being generated...",
        })
        router.push("/plan?generating=true")
        fetchPlan()
      } else {
        throw new Error("Failed to regenerate")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to regenerate plan. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsRegenerating(false)
    }
  }

  function getGammaStatusBadge(status: string) {
    switch (status) {
      case "completed":
        return <Badge className="bg-green-600">Ready</Badge>
      case "pending":
      case "queued":
        return <Badge variant="secondary">Processing...</Badge>
      case "failed":
        return <Badge variant="destructive">Failed</Badge>
      default:
        return <Badge variant="outline">Unknown</Badge>
    }
  }

  if (isLoading || status !== "authenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your plan...</p>
        </div>
      </div>
    )
  }

  if (!plan) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md">
          <CardHeader>
            <CardTitle>No Plan Yet</CardTitle>
            <CardDescription>
              Complete the questionnaire to generate your personalized nutrition plan.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={() => router.push("/questionnaire")}>
              Start Questionnaire
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const targets = plan.derivedTargets as DerivedTargetsType

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <header className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">E</span>
            </div>
            <span className="text-xl font-bold text-gray-900">Elite Health</span>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => router.push("/dashboard")}>
              Dashboard
            </Button>
          </div>
        </header>

        {/* Derived Targets Summary */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Your Daily Targets</CardTitle>
            <CardDescription>
              Based on your stats and goals
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-sm text-gray-600">Protein</p>
                <p className="text-2xl font-bold text-green-600">
                  {targets.proteinMin}–{targets.proteinMax}g
                </p>
              </div>
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-sm text-gray-600">Calories</p>
                <p className="text-2xl font-bold text-blue-600">
                  ~{targets.caloriesPerDay}
                </p>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <p className="text-sm text-gray-600">Goal Mode</p>
                <p className="text-lg font-bold text-purple-600 capitalize">
                  {targets.goalMode.replace("_", " ")}
                </p>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <p className="text-sm text-gray-600">Version</p>
                <p className="text-2xl font-bold text-orange-600">
                  v{plan.version}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Gamma Status */}
        {plan.gammaGeneration && (
          <Card className="mb-8">
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Export Status</CardTitle>
                  <CardDescription>
                    Gamma document generation
                  </CardDescription>
                </div>
                {getGammaStatusBadge(plan.gammaGeneration.status)}
              </div>
            </CardHeader>
            <CardContent>
              {plan.gammaGeneration.status === "completed" && plan.gammaGeneration.gammaUrl && (
                <div className="flex gap-4">
                  <a
                    href={plan.gammaGeneration.gammaUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Button>Open in Gamma</Button>
                  </a>
                </div>
              )}
              {plan.gammaGeneration.status === "pending" && (
                <p className="text-gray-600">
                  Your document is being generated. This usually takes 1-2 minutes.
                </p>
              )}
              {plan.gammaGeneration.status === "failed" && (
                <p className="text-red-600">
                  Document generation failed: {plan.gammaGeneration.error || "Unknown error"}
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Actions */}
        <div className="flex gap-4 mb-8">
          <Button variant="outline" onClick={handleRegenerate} disabled={isRegenerating}>
            {isRegenerating ? "Regenerating..." : "Regenerate Plan"}
          </Button>
          <Button variant="outline" onClick={() => router.push("/questionnaire")}>
            Edit Questionnaire
          </Button>
        </div>

        {/* Plan Content */}
        <Card>
          <CardContent className="pt-6">
            <div className="prose prose-green max-w-none">
              <ReactMarkdown>{plan.markdown}</ReactMarkdown>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
