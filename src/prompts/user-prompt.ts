import { QuestionnaireAnswers } from "@/questionnaire/schema"
import { DerivedTargets } from "@/lib/derived-targets"

export function buildUserPrompt(answers: QuestionnaireAnswers, targets: DerivedTargets): string {
  const proteinPrefs = answers.proteinPreferences.join(", ")
  
  return `CLIENT BRIEF (use this as source of truth)

Name: ${answers.firstName}
Sex: ${answers.sex}
Age: ${answers.age}
Height: ${answers.heightCm} cm
Weight: ${answers.weightKg} kg (${targets.weightLb} lb)

90-day primary goal: ${answers.primaryGoal}

Schedule:
- Wake: ${answers.wakeTime}
- Sleep: ${answers.sleepTime}
- Work schedule: ${answers.workSchedule}
- Kitchen access daytime: ${answers.kitchenAccessDaytime}
- Meal prep willingness: ${answers.mealPrepWillingness}

Training:
- Days/week: ${answers.trainingDaysPerWeek}
- Time: ${answers.trainingTimeOfDay}
- Daily steps: ${answers.dailySteps}

Preferences:
- Diet style: ${answers.dietStyle}
- Allergies/intolerances: ${answers.allergiesIntolerances || "None"}
- Foods they love: ${answers.foodsLove}
- Foods they dislike/avoid: ${answers.foodsHateAvoid || "None specified"}
- Preferred proteins: ${proteinPrefs}

Real life:
- Biggest obstacle: ${answers.biggestObstacle}
- Takeaways + usual orders: ${answers.takeawaysAndOrders}
- Alcohol: ${answers.alcoholPerWeek}

DERIVED TARGETS (must be used)
Protein target grams/day range: ${targets.proteinMin}–${targets.proteinMax} g
Calories/day starting point: ~${targets.caloriesPerDay} kcal/day
Goal mode: ${targets.goalMode}

REQUIREMENT
- Build the full 90-day plan in the strict Elite Health format.
- Make best assumptions if something is missing.
- Keep it practical and repeatable. No macro tracking required.
Return ONLY markdown.`
}
