import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { prisma } from "@/lib/prisma"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

export default async function DashboardPage() {
  const session = await getServerSession(authOptions)

  if (!session) {
    redirect("/login")
  }

  // Get user's active questionnaire and latest plan
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
    },
  })

  const hasActiveQuestionnaire = user?.questionnaires && user.questionnaires.length > 0
  const hasPlan = user?.plans && user.plans.length > 0
  const latestPlan = user?.plans?.[0]

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
            <span className="text-gray-600">{session.user.email}</span>
            <Link href="/api/auth/signout">
              <Button variant="outline" size="sm">
                Sign Out
              </Button>
            </Link>
          </div>
        </header>

        {/* Main Content */}
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold mb-8">Welcome back!</h1>

          {/* Status Cards */}
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Questionnaire Status */}
            <Card>
              <CardHeader>
                <CardTitle>Questionnaire</CardTitle>
                <CardDescription>
                  Your health and preferences profile
                </CardDescription>
              </CardHeader>
              <CardContent>
                {hasActiveQuestionnaire ? (
                  <div className="space-y-4">
                    <p className="text-green-600 font-medium">✓ Completed</p>
                    <Link href="/questionnaire">
                      <Button variant="outline">Update Answers</Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-gray-500">Not completed yet</p>
                    <Link href="/questionnaire">
                      <Button>Start Questionnaire</Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Plan Status */}
            <Card>
              <CardHeader>
                <CardTitle>Nutrition Plan</CardTitle>
                <CardDescription>
                  Your personalized 90-day plan
                </CardDescription>
              </CardHeader>
              <CardContent>
                {hasPlan ? (
                  <div className="space-y-4">
                    <p className="text-green-600 font-medium">✓ Generated</p>
                    <p className="text-sm text-gray-500">
                      Version {latestPlan?.version} • Created{" "}
                      {latestPlan?.createdAt.toLocaleDateString()}
                    </p>
                    <Link href="/plan">
                      <Button>View Plan</Button>
                    </Link>
                  </div>
                ) : hasActiveQuestionnaire ? (
                  <div className="space-y-4">
                    <p className="text-gray-500">Generating...</p>
                    <p className="text-sm text-gray-500">
                      Your plan is being created. This may take a minute.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-gray-500">
                      Complete the questionnaire first
                    </p>
                    <Link href="/questionnaire">
                      <Button variant="outline">Start Questionnaire</Button>
                    </Link>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <Link href="/questionnaire">
                  <Button variant="outline">
                    {hasActiveQuestionnaire ? "Edit Questionnaire" : "Start Questionnaire"}
                  </Button>
                </Link>
                {hasPlan && (
                  <>
                    <Link href="/plan">
                      <Button variant="outline">View Plan</Button>
                    </Link>
                    <Link href="/plan?regenerate=true">
                      <Button variant="outline">Regenerate Plan</Button>
                    </Link>
                  </>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
