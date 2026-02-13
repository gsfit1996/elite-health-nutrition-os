import { describe, expect, it } from "vitest"
import { calculateDerivedTargets } from "@/lib/derived-targets"
import { QuestionnaireAnswers } from "@/questionnaire/schema"

const sampleAnswers: QuestionnaireAnswers = {
  firstName: "Alex",
  sex: "Male",
  age: 30,
  heightCm: 180,
  weightKg: 80,
  primaryGoal: "Fat loss",
  wakeTime: "06:30",
  sleepTime: "22:30",
  workSchedule: "Mon-Fri office",
  kitchenAccessDaytime: "Microwave",
  mealPrepWillingness: "Light 10-15 mins",
  trainingDaysPerWeek: 4,
  trainingTimeOfDay: "Morning",
  dailySteps: "8-12k",
  dietStyle: "Omnivore",
  allergiesIntolerances: "",
  foodsLove: "Chicken and rice",
  foodsHateAvoid: "",
  proteinPreferences: ["Chicken", "Eggs"],
  biggestObstacle: "Time",
  takeawaysAndOrders: "0",
  alcoholPerWeek: "1-2",
}

describe("calculateDerivedTargets", () => {
  it("returns deterministic targets for valid answers", () => {
    const result = calculateDerivedTargets(sampleAnswers)

    expect(result.weightKg).toBe(80)
    expect(result.weightLb).toBeCloseTo(176.4, 1)
    expect(result.proteinMin).toBeGreaterThan(0)
    expect(result.proteinMax).toBeGreaterThan(result.proteinMin)
    expect(result.caloriesPerDay).toBeGreaterThan(0)
    expect(result.goalMode).toBe("fat_loss")
  })
})

