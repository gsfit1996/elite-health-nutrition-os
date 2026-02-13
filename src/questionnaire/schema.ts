import { z } from "zod"

// Step 1: Stats + Goal
export const statsGoalSchema = z.object({
  firstName: z.string().min(1, "First name is required"),
  sex: z.enum(["Male", "Female"]),
  age: z.number().min(16, "Age must be at least 16").max(90, "Age must be at most 90"),
  heightCm: z.number().min(120, "Height must be at least 120cm").max(230, "Height must be at most 230cm"),
  weightKg: z.number().min(35, "Weight must be at least 35kg").max(250, "Weight must be at most 250kg"),
  primaryGoal: z.enum(["Fat loss", "Recomposition", "Muscle gain", "Energy + focus"]),
})

// Step 2: Routine Constraints
export const routineSchema = z.object({
  wakeTime: z.string().min(1, "Wake time is required"),
  sleepTime: z.string().min(1, "Sleep time is required"),
  workSchedule: z.string().min(1, "Work schedule is required"),
  kitchenAccessDaytime: z.enum(["None", "Microwave", "Full kitchen"]),
  mealPrepWillingness: z.enum(["None", "Light 10-15 mins", "Batch cook 1-2x week"]),
})

// Step 3: Training/Activity
export const trainingSchema = z.object({
  trainingDaysPerWeek: z.number().min(0).max(7, "Training days must be between 0 and 7"),
  trainingTimeOfDay: z.enum(["Morning", "Lunch", "Evening", "Varies"]),
  dailySteps: z.enum(["<5k", "5-8k", "8-12k", "12k+"]),
})

// Step 4: Preferences + Real Life
export const preferencesSchema = z.object({
  dietStyle: z.enum(["Omnivore", "Pescatarian", "Vegetarian", "Vegan", "Other"]),
  allergiesIntolerances: z.string().optional(),
  foodsLove: z.string().min(1, "Please tell us what foods you love"),
  foodsHateAvoid: z.string().optional(),
  proteinPreferences: z.array(
    z.enum(["Chicken", "Beef", "Fish", "Eggs", "Greek yogurt", "Protein shakes", "Tofu-Tempeh", "Beans-Lentils"])
  ).min(1, "Select at least one protein preference"),
  biggestObstacle: z.enum([
    "Time",
    "Stress",
    "Cravings",
    "Travel",
    "Social eating",
    "Night eating",
    "Inconsistent schedule",
  ]),
  takeawaysAndOrders: z.string().min(1, "Takeaways info is required (enter '0' if none)"),
  alcoholPerWeek: z.enum(["None", "1-2", "3-6", "7+"]),
})

// Full questionnaire schema
export const questionnaireSchema = statsGoalSchema
  .merge(routineSchema)
  .merge(trainingSchema)
  .merge(preferencesSchema)

export type QuestionnaireAnswers = z.infer<typeof questionnaireSchema>
export type StatsGoalAnswers = z.infer<typeof statsGoalSchema>
export type RoutineAnswers = z.infer<typeof routineSchema>
export type TrainingAnswers = z.infer<typeof trainingSchema>
export type PreferencesAnswers = z.infer<typeof preferencesSchema>

// Step configuration for the UI
export const questionnaireSteps = [
  {
    id: "stats-goal",
    title: "About You",
    description: "Your stats and primary goal",
    fields: Object.keys(statsGoalSchema.shape),
  },
  {
    id: "routine",
    title: "Your Routine",
    description: "Daily schedule and constraints",
    fields: Object.keys(routineSchema.shape),
  },
  {
    id: "training",
    title: "Activity",
    description: "Training and movement",
    fields: Object.keys(trainingSchema.shape),
  },
  {
    id: "preferences",
    title: "Preferences",
    description: "Food preferences and lifestyle",
    fields: Object.keys(preferencesSchema.shape),
  },
] as const

export type QuestionnaireStepId = typeof questionnaireSteps[number]["id"]
