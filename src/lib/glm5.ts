import { SYSTEM_PROMPT } from "@/prompts/system-prompt"
import { buildUserPrompt } from "@/prompts/user-prompt"
import { buildRepairPrompt } from "@/prompts/repair-prompt"
import { QuestionnaireAnswers } from "@/questionnaire/schema"
import { DerivedTargets } from "@/lib/derived-targets"
import { validateMarkdown, ValidationResult } from "./markdown-validator"

interface GLM5Response {
  id: string
  created: number
  model: string
  choices: {
    index: number
    message: {
      role: string
      content: string
    }
    finish_reason: string
  }[]
  usage: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

async function callGLM5(messages: { role: string; content: string }[]): Promise<string> {
  const apiKey = process.env.GLM_5_API_KEY
  const endpoint = process.env.GLM_5_ENDPOINT || "https://open.bigmodel.cn/api/paas/v4/chat/completions"

  if (!apiKey) {
    throw new Error("GLM_5_API_KEY is not configured")
  }

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "glm-4",
      messages,
      temperature: 0.7,
      max_tokens: 8000,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error("GLM-5 API error:", errorText)
    throw new Error(`GLM-5 API error: ${response.status} - ${errorText}`)
  }

  const data: GLM5Response = await response.json()
  
  if (!data.choices || data.choices.length === 0) {
    throw new Error("No response from GLM-5")
  }

  return data.choices[0].message.content
}

export interface GeneratePlanResult {
  markdown: string
  validation: ValidationResult
  wasRepaired: boolean
}

export async function generateNutritionPlan(
  answers: QuestionnaireAnswers,
  targets: DerivedTargets
): Promise<GeneratePlanResult> {
  // Build the user prompt with questionnaire data
  const userPrompt = buildUserPrompt(answers, targets)

  // First call to generate the plan
  const initialMarkdown = await callGLM5([
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userPrompt },
  ])

  // Validate the markdown
  const initialValidation = validateMarkdown(initialMarkdown, answers.firstName)

  if (initialValidation.isValid) {
    return {
      markdown: initialMarkdown,
      validation: initialValidation,
      wasRepaired: false,
    }
  }

  // If invalid, try repair once
  console.log("Initial markdown validation failed, attempting repair...")
  console.log("Issues:", initialValidation.issues)

  const repairPrompt = buildRepairPrompt(initialMarkdown, initialValidation.issues)

  const repairedMarkdown = await callGLM5([
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userPrompt },
    { role: "assistant", content: initialMarkdown },
    { role: "user", content: repairPrompt },
  ])

  // Validate the repaired markdown
  const repairedValidation = validateMarkdown(repairedMarkdown, answers.firstName)

  return {
    markdown: repairedMarkdown,
    validation: repairedValidation,
    wasRepaired: true,
  }
}

// Simple hash function for prompt versioning
export function hashPrompt(prompt: string): string {
  let hash = 0
  for (let i = 0; i < prompt.length; i++) {
    const char = prompt.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }
  return hash.toString(16)
}
