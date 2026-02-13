import { QuestionnaireAnswers } from "@/questionnaire/schema"

export interface DerivedTargets {
  weightKg: number
  weightLb: number
  proteinMin: number
  proteinMax: number
  caloriesPerDay: number
  goalMode: string
  bmr: number
  tdee: number
  activityFactor: number
}

export function calculateDerivedTargets(answers: QuestionnaireAnswers): DerivedTargets {
  const { weightKg, heightCm, age, sex, primaryGoal, dailySteps, trainingDaysPerWeek } = answers

  // Weight conversion
  const weightLb = weightKg * 2.20462

  // Protein calculation
  const proteinTarget = weightLb * 1.0
  const proteinMin = Math.round(proteinTarget * 0.90)
  const proteinMax = Math.round(proteinTarget * 1.05)

  // BMR calculation - Mifflin-St Jeor
  let bmr: number
  if (sex === "Male") {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age + 5
  } else {
    bmr = 10 * weightKg + 6.25 * heightCm - 5 * age - 161
  }

  // Activity factor from daily steps
  let activityFactor: number
  switch (dailySteps) {
    case "<5k":
      activityFactor = 1.35
      break
    case "5-8k":
      activityFactor = 1.45
      break
    case "8-12k":
      activityFactor = 1.55
      break
    case "12k+":
      activityFactor = 1.65
      break
    default:
      activityFactor = 1.45
  }

  // Add training bonus
  if (trainingDaysPerWeek >= 4) {
    activityFactor += 0.05
  }

  // TDEE calculation
  const tdee = bmr * activityFactor

  // Goal mode calories
  let caloriesPerDay: number
  let goalMode: string

  switch (primaryGoal) {
    case "Fat loss":
      caloriesPerDay = Math.round(tdee - 400)
      goalMode = "fat_loss"
      break
    case "Recomposition":
      caloriesPerDay = Math.round(tdee - 150)
      goalMode = "recomp"
      break
    case "Muscle gain":
      caloriesPerDay = Math.round(tdee + 200)
      goalMode = "muscle_gain"
      break
    case "Energy + focus":
      caloriesPerDay = Math.round(tdee)
      goalMode = "maintenance"
      break
    default:
      caloriesPerDay = Math.round(tdee)
      goalMode = "maintenance"
  }

  return {
    weightKg,
    weightLb: Math.round(weightLb * 10) / 10,
    proteinMin,
    proteinMax,
    caloriesPerDay,
    goalMode,
    bmr: Math.round(bmr),
    tdee: Math.round(tdee),
    activityFactor,
  }
}
