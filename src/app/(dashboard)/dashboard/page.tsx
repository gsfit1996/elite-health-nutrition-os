import Link from "next/link"
import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { featureFlags } from "@/lib/feature-flags"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

function formatDate(date: Date): string {
  return date.toLocaleDateString()
}

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    redirect("/login")
  }

  const todayDate = new Date().toISOString().slice(0, 10)

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      questionnaires: {
        where: { status: "active" },
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      plans: {
        orderBy: { createdAt: "desc" },
        take: 1,
        include: {
          gammaGeneration: true,
        },
      },
      progressCheckIns: {
        where: { checkInDate: todayDate },
        take: 1,
      },
    },
  })

  const activeQuestionnaire = user?.questionnaires?.[0] || null
  const latestPlan = user?.plans?.[0] || null
  const todayCheckIn = user?.progressCheckIns?.[0] || null

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
          <div className="flex items-center gap-4">
            <span className="text-gray-600">{session.user.email}</span>
            <Link href="/api/auth/signout">
              <Button variant="outline" size="sm">
                Sign Out
              </Button>
            </Link>
          </div>
        </header>

        <h1 className="mb-8 text-3xl font-bold text-gray-900">Welcome back</h1>

        <div className="mb-8 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Questionnaire</CardTitle>
              <CardDescription>Your health and preference profile</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {activeQuestionnaire ? (
                <>
                  <p className="font-medium text-green-700">Completed</p>
                  <Link href="/questionnaire">
                    <Button variant="outline">Update Answers</Button>
                  </Link>
                </>
              ) : (
                <>
                  <p className="text-gray-500">Not completed yet</p>
                  <Link href="/questionnaire">
                    <Button>Start Questionnaire</Button>
                  </Link>
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Nutrition Plan</CardTitle>
              <CardDescription>Your personalized 90-day plan</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {latestPlan?.status === "ready" ? (
                <>
                  <p className="font-medium text-green-700">Ready</p>
                  <p className="text-sm text-gray-500">
                    Version {latestPlan.version} · Created {formatDate(latestPlan.createdAt)}
                  </p>
                  <Link href="/plan">
                    <Button>View Plan</Button>
                  </Link>
                </>
              ) : latestPlan?.status === "generating" ? (
                <>
                  <p className="font-medium text-gray-700">Generating...</p>
                  <p className="text-sm text-gray-500">Your plan is queued and processing.</p>
                  <Link href="/plan?generating=true">
                    <Button variant="outline">View Status</Button>
                  </Link>
                </>
              ) : latestPlan?.status === "failed" ? (
                <>
                  <p className="font-medium text-red-700">Generation failed</p>
                  <p className="text-sm text-gray-500">
                    {latestPlan.error || "Please try regenerate."}
                  </p>
                  <Link href="/plan">
                    <Button variant="outline">Open Plan</Button>
                  </Link>
                </>
              ) : activeQuestionnaire ? (
                <>
                  <p className="text-gray-500">Ready to generate</p>
                  <Link href="/questionnaire">
                    <Button variant="outline">Review Questionnaire</Button>
                  </Link>
                </>
              ) : (
                <>
                  <p className="text-gray-500">Complete questionnaire first</p>
                  <Link href="/questionnaire">
                    <Button variant="outline">Start Questionnaire</Button>
                  </Link>
                </>
              )}
            </CardContent>
          </Card>

          {featureFlags.progressTracking && (
            <Card>
              <CardHeader>
                <CardTitle>Daily Progress</CardTitle>
                <CardDescription>Today&apos;s check-in status</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {todayCheckIn ? (
                  <>
                    <p className="font-medium text-green-700">Checked in today</p>
                    <p className="text-sm text-gray-500">
                      Adherence: {todayCheckIn.adherencePercent}%
                    </p>
                  </>
                ) : (
                  <p className="text-gray-500">No check-in submitted today.</p>
                )}
                <Link href="/progress">
                  <Button variant={todayCheckIn ? "outline" : "default"}>
                    {todayCheckIn ? "Update Check-In" : "Complete Check-In"}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Link href="/questionnaire">
                <Button variant="outline">
                  {activeQuestionnaire ? "Edit Questionnaire" : "Start Questionnaire"}
                </Button>
              </Link>
              <Link href="/plan">
                <Button variant="outline">View Plan</Button>
              </Link>
              <Link href="/plan?regenerate=true">
                <Button variant="outline">Regenerate Plan</Button>
              </Link>
              {featureFlags.progressTracking && (
                <Link href="/progress">
                  <Button variant="outline">Open Progress</Button>
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

