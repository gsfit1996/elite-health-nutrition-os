import { SYSTEM_PROMPT } from "@/prompts/system-prompt"
import { buildUserPrompt } from "@/prompts/user-prompt"
import { buildRepairPrompt } from "@/prompts/repair-prompt"
import { QuestionnaireAnswers } from "@/questionnaire/schema"
import { DerivedTargets } from "@/lib/derived-targets"
import { validateMarkdown, ValidationResult } from "./markdown-validator"
import { createHash } from "crypto"
import { AIChatMessage } from "@/lib/ai/provider"
import { getBigModelProvider } from "@/lib/ai/providers/bigmodel"
import { logInfo } from "@/lib/logger"

async function callGLM5(messages: AIChatMessage[]): Promise<string> {
  const provider = getBigModelProvider()
  const result = await provider.generate(messages)
  return result.content
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
  logInfo("plan.validation.initial_failed", {
    issues: initialValidation.issues,
    firstName: answers.firstName,
  })

  const repairPrompt = buildRepairPrompt(initialMarkdown, initialValidation.issues)

  const repairedMarkdown = await callGLM5([
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userPrompt },
    { role: "assistant", content: initialMarkdown },
    { role: "user", content: repairPrompt },
  ])

  // Validate the repaired markdown
  const repairedValidation = validateMarkdown(repairedMarkdown, answers.firstName)

  if (!repairedValidation.isValid) {
    throw new Error(
      `Generated markdown failed validation after repair: ${repairedValidation.issues.join("; ")}`
    )
  }

  return {
    markdown: repairedMarkdown,
    validation: repairedValidation,
    wasRepaired: true,
  }
}

// Simple hash function for prompt versioning
export function hashPrompt(prompt: string): string {
  return createHash("sha256").update(prompt).digest("hex")
}
