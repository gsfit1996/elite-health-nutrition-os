import { redirect } from "next/navigation"
import { getServerSession } from "next-auth"
import { authOptions } from "@/lib/auth"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"

export default async function HomePage() {
  const session = await getServerSession(authOptions)

  return (
    <main className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      <div className="container mx-auto px-4 py-16">
        {/* Header */}
        <header className="flex justify-between items-center mb-16">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-green-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">E</span>
            </div>
            <span className="text-xl font-bold text-gray-900">Elite Health</span>
          </div>
          <nav className="flex gap-4">
            {session ? (
              <Link href="/dashboard">
                <Button>Dashboard</Button>
              </Link>
            ) : (
              <Link href="/login">
                <Button variant="outline">Sign In</Button>
              </Link>
            )}
          </nav>
        </header>

        {/* Hero Section */}
        <div className="text-center max-w-3xl mx-auto mb-16">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            Your Personalized 90-Day
            <span className="text-green-600"> Nutrition Plan</span>
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Get a science-backed, personalized nutrition plan designed for your goals, 
            schedule, and preferences. No generic meal plans—just practical, 
            sustainable guidance tailored to your life.
          </p>
          <div className="flex gap-4 justify-center">
            {session ? (
              <Link href="/questionnaire">
                <Button size="lg" className="text-lg px-8">
                  Create Your Plan
                </Button>
              </Link>
            ) : (
              <Link href="/login">
                <Button size="lg" className="text-lg px-8">
                  Get Started Free
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto mb-16">
          <Card>
            <CardHeader>
              <CardTitle className="text-green-600">Personalized</CardTitle>
              <CardDescription>
                Based on your stats, goals, and lifestyle
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Every recommendation is tailored to your specific situation—your schedule, 
                cooking ability, food preferences, and goals.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-green-600">Practical</CardTitle>
              <CardDescription>
                Real-world solutions for busy people
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                No complicated recipes or hard-to-find ingredients. Simple, 
                repeatable meals that fit into your actual life.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-green-600">Science-Backed</CardTitle>
              <CardDescription>
                Evidence-based nutrition strategies
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                Calculated protein targets, calorie estimates, and proven 
                strategies for sustainable results over 90 days.
              </p>
            </CardContent>
          </Card>
        </div>

        {/* How It Works */}
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-center mb-8">How It Works</h2>
          <div className="space-y-6">
            <div className="flex gap-4 items-start">
              <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white font-bold shrink-0">
                1
              </div>
              <div>
                <h3 className="font-semibold text-lg">Complete the Questionnaire</h3>
                <p className="text-gray-600">
                  Answer questions about your stats, goals, routine, and food preferences. 
                  Takes about 5 minutes.
                </p>
              </div>
            </div>
            <div className="flex gap-4 items-start">
              <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white font-bold shrink-0">
                2
              </div>
              <div>
                <h3 className="font-semibold text-lg">Get Your Personalized Plan</h3>
                <p className="text-gray-600">
                  Our AI generates a comprehensive 90-day nutrition plan with meal options, 
                  grocery lists, and practical strategies.
                </p>
              </div>
            </div>
            <div className="flex gap-4 items-start">
              <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center text-white font-bold shrink-0">
                3
              </div>
              <div>
                <h3 className="font-semibold text-lg">Export & Follow</h3>
                <p className="text-gray-600">
                  View your plan online or export it as a beautifully formatted document. 
                  Update and regenerate anytime.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="text-center mt-16">
          {session ? (
            <Link href="/questionnaire">
              <Button size="lg" className="text-lg px-12">
                Start Your Plan Now
              </Button>
            </Link>
          ) : (
            <Link href="/login">
              <Button size="lg" className="text-lg px-12">
                Sign Up Free
              </Button>
            </Link>
          )}
        </div>
      </div>
    </main>
  )
}
