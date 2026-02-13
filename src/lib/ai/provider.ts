export type AIMessageRole = "system" | "user" | "assistant"

export interface AIChatMessage {
  role: AIMessageRole
  content: string
}

export interface AIProviderOptions {
  model?: string
  temperature?: number
  maxTokens?: number
}

export interface AIGenerateResult {
  content: string
  usage?: {
    promptTokens: number
    completionTokens: number
    totalTokens: number
  }
}

export class AIProviderError extends Error {
  status?: number
  details?: string

  constructor(message: string, options: { status?: number; details?: string } = {}) {
    super(message)
    this.name = "AIProviderError"
    this.status = options.status
    this.details = options.details
  }
}

export interface AIProvider {
  readonly name: string
  readonly defaultModel: string
  generate(messages: AIChatMessage[], options?: AIProviderOptions): Promise<AIGenerateResult>
}

