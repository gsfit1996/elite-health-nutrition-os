"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { useSession } from "next-auth/react"
import { useForm, Controller } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useToast } from "@/components/ui/use-toast"
import { questionnaireSchema, QuestionnaireAnswers, questionnaireSteps } from "@/questionnaire/schema"

const PROTEIN_OPTIONS = [
  "Chicken",
  "Beef",
  "Fish",
  "Eggs",
  "Greek yogurt",
  "Protein shakes",
  "Tofu-Tempeh",
  "Beans-Lentils",
] as const

export default function QuestionnairePage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const { toast } = useToast()
  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoading, setIsLoading] = useState(true)

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    getValues,
    formState: { errors },
  } = useForm<QuestionnaireAnswers>({
    resolver: zodResolver(questionnaireSchema),
    defaultValues: {
      firstName: "",
      sex: undefined,
      age: 0,
      heightCm: 0,
      weightKg: 0,
      primaryGoal: undefined,
      wakeTime: "",
      sleepTime: "",
      workSchedule: "",
      kitchenAccessDaytime: undefined,
      mealPrepWillingness: undefined,
      trainingDaysPerWeek: 0,
      trainingTimeOfDay: undefined,
      dailySteps: undefined,
      dietStyle: undefined,
      allergiesIntolerances: "",
      foodsLove: "",
      foodsHateAvoid: "",
      proteinPreferences: [],
      biggestObstacle: undefined,
      takeawaysAndOrders: "",
      alcoholPerWeek: undefined,
    },
  })

  // Load existing questionnaire or draft
  useEffect(() => {
    async function loadQuestionnaire() {
      if (status === "unauthenticated") {
        router.push("/login")
        return
      }

      if (status !== "authenticated") return

      try {
        // Try to load from localStorage first
        const savedDraft = localStorage.getItem("questionnaire-draft")
        if (savedDraft) {
          const parsed = JSON.parse(savedDraft)
          Object.keys(parsed).forEach((key) => {
            setValue(key as any, parsed[key])
          })
        }

        // Then try to load from server
        const response = await fetch("/api/questionnaire")
        if (response.ok) {
          const data = await response.json()
          if (data.questionnaire) {
            Object.keys(data.questionnaire.answers).forEach((key) => {
              setValue(key as any, data.questionnaire.answers[key])
            })
          }
        }
      } catch (error) {
        console.error("Error loading questionnaire:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadQuestionnaire()
  }, [status, router, setValue])

  // Save draft to localStorage on change
  useEffect(() => {
    const subscription = watch((value) => {
      localStorage.setItem("questionnaire-draft", JSON.stringify(value))
    })
    return () => subscription.unsubscribe()
  }, [watch])

  const currentStepData = questionnaireSteps[currentStep]
  const progress = ((currentStep + 1) / questionnaireSteps.length) * 100

  const handleNext = async () => {
    // Validate current step fields
    const currentFields = currentStepData.fields as (keyof QuestionnaireAnswers)[]
    const currentValues = getValues()
    
    // Basic validation for current step
    let hasErrors = false
    for (const field of currentFields) {
      const value = currentValues[field]
      if (value === undefined || value === "" || value === 0 || 
        (Array.isArray(value) && value.length === 0)) {
        hasErrors = true
        break
      }
    }

    if (hasErrors) {
      // Trigger validation for current step
      toast({
        title: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    // Save to server
    try {
      const response = await fetch("/api/questionnaire", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          step: currentStep,
          answers: getValues(),
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to save")
      }
    } catch (error) {
      console.error("Error saving step:", error)
    }

    if (currentStep < questionnaireSteps.length - 1) {
      setCurrentStep(currentStep + 1)
      window.scrollTo(0, 0)
    }
  }

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
      window.scrollTo(0, 0)
    }
  }

  const onSubmit = async (data: QuestionnaireAnswers) => {
    setIsSubmitting(true)

    try {
      const response = await fetch("/api/questionnaire/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        throw new Error("Failed to submit")
      }

      // Clear draft
      localStorage.removeItem("questionnaire-draft")

      toast({
        title: "Questionnaire completed!",
        description: "Generating your personalized plan...",
      })

      // Redirect to plan page
      router.push("/plan?generating=true")
    } catch (error) {
      console.error("Error submitting questionnaire:", error)
      toast({
        title: "Error",
        description: "Failed to submit questionnaire. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoading || status !== "authenticated") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="container mx-auto px-4 max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold mb-2">{currentStepData.title}</h1>
          <p className="text-gray-600">{currentStepData.description}</p>
        </div>

        {/* Progress */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Step {currentStep + 1} of {questionnaireSteps.length}</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} />
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Step 1: Stats + Goal */}
          {currentStep === 0 && (
            <Card>
              <CardContent className="pt-6 space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name *</Label>
                  <Input id="firstName" {...register("firstName")} />
                  {errors.firstName && (
                    <p className="text-sm text-red-500">{errors.firstName.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Sex *</Label>
                  <Controller
                    name="sex"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select sex" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Male">Male</SelectItem>
                          <SelectItem value="Female">Female</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.sex && (
                    <p className="text-sm text-red-500">{errors.sex.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="age">Age *</Label>
                  <Input
                    id="age"
                    type="number"
                    {...register("age", { valueAsNumber: true })}
                    placeholder="e.g., 35"
                  />
                  {errors.age && (
                    <p className="text-sm text-red-500">{errors.age.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="heightCm">Height (cm) *</Label>
                  <Input
                    id="heightCm"
                    type="number"
                    {...register("heightCm", { valueAsNumber: true })}
                    placeholder="e.g., 175"
                  />
                  {errors.heightCm && (
                    <p className="text-sm text-red-500">{errors.heightCm.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="weightKg">Weight (kg) *</Label>
                  <Input
                    id="weightKg"
                    type="number"
                    {...register("weightKg", { valueAsNumber: true })}
                    placeholder="e.g., 75"
                  />
                  {errors.weightKg && (
                    <p className="text-sm text-red-500">{errors.weightKg.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Primary Goal *</Label>
                  <Controller
                    name="primaryGoal"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select your primary goal" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Fat loss">Fat loss</SelectItem>
                          <SelectItem value="Recomposition">Recomposition</SelectItem>
                          <SelectItem value="Muscle gain">Muscle gain</SelectItem>
                          <SelectItem value="Energy + focus">Energy + focus</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.primaryGoal && (
                    <p className="text-sm text-red-500">{errors.primaryGoal.message}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 2: Routine */}
          {currentStep === 1 && (
            <Card>
              <CardContent className="pt-6 space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="wakeTime">Wake Time *</Label>
                  <Input
                    id="wakeTime"
                    type="time"
                    {...register("wakeTime")}
                  />
                  {errors.wakeTime && (
                    <p className="text-sm text-red-500">{errors.wakeTime.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="sleepTime">Sleep Time *</Label>
                  <Input
                    id="sleepTime"
                    type="time"
                    {...register("sleepTime")}
                  />
                  {errors.sleepTime && (
                    <p className="text-sm text-red-500">{errors.sleepTime.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="workSchedule">Work Schedule *</Label>
                  <Textarea
                    id="workSchedule"
                    {...register("workSchedule")}
                    placeholder="e.g., Mon–Fri 9–6, travel 2x/month"
                  />
                  {errors.workSchedule && (
                    <p className="text-sm text-red-500">{errors.workSchedule.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Kitchen Access (Daytime) *</Label>
                  <Controller
                    name="kitchenAccessDaytime"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select kitchen access" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="None">None</SelectItem>
                          <SelectItem value="Microwave">Microwave</SelectItem>
                          <SelectItem value="Full kitchen">Full kitchen</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.kitchenAccessDaytime && (
                    <p className="text-sm text-red-500">{errors.kitchenAccessDaytime.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Meal Prep Willingness *</Label>
                  <Controller
                    name="mealPrepWillingness"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select meal prep willingness" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="None">None</SelectItem>
                          <SelectItem value="Light 10-15 mins">Light 10–15 mins</SelectItem>
                          <SelectItem value="Batch cook 1-2x week">Batch cook 1–2x week</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.mealPrepWillingness && (
                    <p className="text-sm text-red-500">{errors.mealPrepWillingness.message}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Training */}
          {currentStep === 2 && (
            <Card>
              <CardContent className="pt-6 space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="trainingDaysPerWeek">Training Days per Week *</Label>
                  <Input
                    id="trainingDaysPerWeek"
                    type="number"
                    min="0"
                    max="7"
                    {...register("trainingDaysPerWeek", { valueAsNumber: true })}
                    placeholder="0-7"
                  />
                  {errors.trainingDaysPerWeek && (
                    <p className="text-sm text-red-500">{errors.trainingDaysPerWeek.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Training Time of Day *</Label>
                  <Controller
                    name="trainingTimeOfDay"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select training time" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Morning">Morning</SelectItem>
                          <SelectItem value="Lunch">Lunch</SelectItem>
                          <SelectItem value="Evening">Evening</SelectItem>
                          <SelectItem value="Varies">Varies</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.trainingTimeOfDay && (
                    <p className="text-sm text-red-500">{errors.trainingTimeOfDay.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Daily Steps *</Label>
                  <Controller
                    name="dailySteps"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select daily steps range" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="<5k">Less than 5k</SelectItem>
                          <SelectItem value="5-8k">5–8k</SelectItem>
                          <SelectItem value="8-12k">8–12k</SelectItem>
                          <SelectItem value="12k+">12k+</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.dailySteps && (
                    <p className="text-sm text-red-500">{errors.dailySteps.message}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Step 4: Preferences */}
          {currentStep === 3 && (
            <Card>
              <CardContent className="pt-6 space-y-6">
                <div className="space-y-2">
                  <Label>Diet Style *</Label>
                  <Controller
                    name="dietStyle"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select diet style" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Omnivore">Omnivore</SelectItem>
                          <SelectItem value="Pescatarian">Pescatarian</SelectItem>
                          <SelectItem value="Vegetarian">Vegetarian</SelectItem>
                          <SelectItem value="Vegan">Vegan</SelectItem>
                          <SelectItem value="Other">Other</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.dietStyle && (
                    <p className="text-sm text-red-500">{errors.dietStyle.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="allergiesIntolerances">Allergies/Intolerances</Label>
                  <Textarea
                    id="allergiesIntolerances"
                    {...register("allergiesIntolerances")}
                    placeholder="e.g., None, or list specific allergies"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="foodsLove">Foods You Love *</Label>
                  <Textarea
                    id="foodsLove"
                    {...register("foodsLove")}
                    placeholder="e.g., Chicken, rice, eggs, oats, bananas..."
                  />
                  {errors.foodsLove && (
                    <p className="text-sm text-red-500">{errors.foodsLove.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="foodsHateAvoid">Foods You Dislike/Avoid</Label>
                  <Textarea
                    id="foodsHateAvoid"
                    {...register("foodsHateAvoid")}
                    placeholder="e.g., Mushrooms, olives..."
                  />
                </div>

                <div className="space-y-2">
                  <Label>Protein Preferences * (select all that apply)</Label>
                  <div className="grid grid-cols-2 gap-2">
                    {PROTEIN_OPTIONS.map((protein) => (
                      <label
                        key={protein}
                        className="flex items-center space-x-2 p-2 border rounded hover:bg-gray-50 cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          value={protein}
                          {...register("proteinPreferences")}
                          className="rounded border-gray-300"
                        />
                        <span className="text-sm">{protein}</span>
                      </label>
                    ))}
                  </div>
                  {errors.proteinPreferences && (
                    <p className="text-sm text-red-500">{errors.proteinPreferences.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Biggest Obstacle *</Label>
                  <Controller
                    name="biggestObstacle"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select biggest obstacle" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Time">Time</SelectItem>
                          <SelectItem value="Stress">Stress</SelectItem>
                          <SelectItem value="Cravings">Cravings</SelectItem>
                          <SelectItem value="Travel">Travel</SelectItem>
                          <SelectItem value="Social eating">Social eating</SelectItem>
                          <SelectItem value="Night eating">Night eating</SelectItem>
                          <SelectItem value="Inconsistent schedule">Inconsistent schedule</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.biggestObstacle && (
                    <p className="text-sm text-red-500">{errors.biggestObstacle.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="takeawaysAndOrders">Takeaways & Usual Orders *</Label>
                  <Textarea
                    id="takeawaysAndOrders"
                    {...register("takeawaysAndOrders")}
                    placeholder="e.g., 0, or 'Usually order from Nando's on Fridays'"
                  />
                  {errors.takeawaysAndOrders && (
                    <p className="text-sm text-red-500">{errors.takeawaysAndOrders.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Alcohol per Week *</Label>
                  <Controller
                    name="alcoholPerWeek"
                    control={control}
                    render={({ field }) => (
                      <Select onValueChange={field.onChange} value={field.value}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select alcohol consumption" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="None">None</SelectItem>
                          <SelectItem value="1-2">1–2</SelectItem>
                          <SelectItem value="3-6">3–6</SelectItem>
                          <SelectItem value="7+">7+</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  {errors.alcoholPerWeek && (
                    <p className="text-sm text-red-500">{errors.alcoholPerWeek.message}</p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Navigation */}
          <div className="flex justify-between mt-6">
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 0}
            >
              Back
            </Button>

            {currentStep < questionnaireSteps.length - 1 ? (
              <Button type="button" onClick={handleNext}>
                Next
              </Button>
            ) : (
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Generating Plan..." : "Generate My Plan"}
              </Button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
