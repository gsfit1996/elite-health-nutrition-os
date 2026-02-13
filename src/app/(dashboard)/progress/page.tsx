"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"

interface ProgressCheckIn {
  id: string
  checkInDate: string
  timezone: string
  weightKg: number | null
  adherencePercent: number
  notes: string | null
}

interface ProgressSummary {
  totalCheckIns: number
  averageAdherencePercent: number
  streakDays: number
  weightDeltaKg: number | null
}

function getTodayDate(): string {
  return new Date().toISOString().slice(0, 10)
}

function getDate30DaysAgo(): string {
  const date = new Date()
  date.setUTCDate(date.getUTCDate() - 29)
  return date.toISOString().slice(0, 10)
}

export default function ProgressPage() {
  const { status } = useSession()
  const router = useRouter()
  const { toast } = useToast()

  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [history, setHistory] = useState<ProgressCheckIn[]>([])
  const [summary, setSummary] = useState<ProgressSummary | null>(null)
  const [weightKg, setWeightKg] = useState("")
  const [adherencePercent, setAdherencePercent] = useState("80")
  const [notes, setNotes] = useState("")

  const todayDate = useMemo(() => getTodayDate(), [])
  const timezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
    []
  )

  const refreshData = useCallback(async () => {
    const [historyResponse, summaryResponse] = await Promise.all([
      fetch(`/api/progress/check-ins?from=${getDate30DaysAgo()}&to=${todayDate}`),
      fetch(`/api/progress/summary?to=${todayDate}`),
    ])

    if (historyResponse.ok) {
      const payload = await historyResponse.json()
      setHistory(payload.checkIns || [])
      const existingToday = (payload.checkIns || []).find(
        (item: ProgressCheckIn) => item.checkInDate === todayDate
      )
      if (existingToday) {
        setWeightKg(existingToday.weightKg?.toString() || "")
        setAdherencePercent(String(existingToday.adherencePercent))
        setNotes(existingToday.notes || "")
      }
    }

    if (summaryResponse.ok) {
      const payload = await summaryResponse.json()
      setSummary(payload.summary)
    }
  }, [todayDate])

  useEffect(() => {
    if (status === "unauthenticated") {
      router.push("/login")
      return
    }

    if (status !== "authenticated") return

    refreshData()
      .catch(() => {
        toast({
          title: "Error",
          description: "Failed to load progress data.",
          variant: "destructive",
        })
      })
      .finally(() => setIsLoading(false))
  }, [status, router, toast, refreshData])

  async function handleSaveCheckIn() {
    const adherenceValue = Number(adherencePercent)
    const weightValue = weightKg.trim() === "" ? undefined : Number(weightKg)

    if (Number.isNaN(adherenceValue) || adherenceValue < 0 || adherenceValue > 100) {
      toast({
        title: "Invalid adherence",
        description: "Adherence must be between 0 and 100.",
        variant: "destructive",
      })
      return
    }

    if (weightValue !== undefined && (Number.isNaN(weightValue) || weightValue < 35 || weightValue > 300)) {
      toast({
        title: "Invalid weight",
        description: "Weight must be between 35kg and 300kg.",
        variant: "destructive",
      })
      return
    }

    setIsSaving(true)
    try {
      const response = await fetch("/api/progress/check-ins", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          checkInDate: todayDate,
          timezone,
          weightKg: weightValue,
          adherencePercent: adherenceValue,
          notes: notes.trim() || undefined,
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to save check-in")
      }

      toast({
        title: "Check-in saved",
        description: "Your daily progress has been updated.",
      })

      await refreshData()
    } catch {
      toast({
        title: "Save failed",
        description: "Could not save your check-in. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  if (isLoading || status !== "authenticated") {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 animate-spin rounded-full border-b-2 border-green-600" />
          <p className="mt-4 text-gray-600">Loading progress...</p>
        </div>
      </div>
    )
  }

  const weightDeltaLabel =
    summary && summary.weightDeltaKg !== null
      ? `${summary.weightDeltaKg > 0 ? "+" : ""}${summary.weightDeltaKg}kg`
      : "N/A"

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto max-w-5xl px-4 py-8">
        <header className="mb-8 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-600">
              <span className="text-xl font-bold text-white">E</span>
            </div>
            <span className="text-xl font-bold text-gray-900">Elite Health</span>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => router.push("/dashboard")}>
              Dashboard
            </Button>
            <Button variant="outline" onClick={() => router.push("/plan")}>
              View Plan
            </Button>
          </div>
        </header>

        <h1 className="mb-2 text-3xl font-bold text-gray-900">Daily Progress</h1>
        <p className="mb-8 text-gray-600">
          Track weight, adherence, and notes each day to monitor momentum.
        </p>

        <div className="mb-8 grid gap-4 md:grid-cols-4">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>30-Day Check-Ins</CardDescription>
              <CardTitle>{summary?.totalCheckIns ?? 0}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Avg Adherence</CardDescription>
              <CardTitle>{summary?.averageAdherencePercent ?? 0}%</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Current Streak</CardDescription>
              <CardTitle>{summary?.streakDays ?? 0} days</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Weight Delta</CardDescription>
              <CardTitle>{weightDeltaLabel}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Today&apos;s Check-In</CardTitle>
              <CardDescription>{todayDate} ({timezone})</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="weightKg">Weight (kg)</Label>
                <Input
                  id="weightKg"
                  type="number"
                  step="0.1"
                  value={weightKg}
                  onChange={(event) => setWeightKg(event.target.value)}
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adherencePercent">Adherence (%)</Label>
                <Input
                  id="adherencePercent"
                  type="number"
                  min={0}
                  max={100}
                  value={adherencePercent}
                  onChange={(event) => setAdherencePercent(event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  placeholder="Wins, blockers, context..."
                  rows={4}
                />
              </div>
              <Button onClick={handleSaveCheckIn} disabled={isSaving}>
                {isSaving ? "Saving..." : "Save Check-In"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Adherence Trend (30 Days)</CardTitle>
              <CardDescription>Most recent first</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {history.length === 0 ? (
                <p className="text-sm text-gray-500">No check-ins yet.</p>
              ) : (
                history.map((item) => (
                  <div key={item.id} className="rounded border bg-white p-3">
                    <div className="mb-2 flex items-center justify-between text-sm">
                      <span className="font-medium">{item.checkInDate}</span>
                      <span>{item.adherencePercent}%</span>
                    </div>
                    <div className="h-2 w-full rounded bg-gray-100">
                      <div
                        className="h-2 rounded bg-green-500"
                        style={{ width: `${item.adherencePercent}%` }}
                      />
                    </div>
                    <div className="mt-2 text-xs text-gray-500">
                      Weight: {item.weightKg === null ? "N/A" : `${item.weightKg}kg`}
                    </div>
                    {item.notes && (
                      <p className="mt-1 text-xs text-gray-600">{item.notes}</p>
                    )}
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
