import {
  AIChatMessage,
  AIGenerateResult,
  AIProvider,
  AIProviderError,
  AIProviderOptions,
} from "@/lib/ai/provider"

interface GLM5Response {
  choices?: {
    message?: {
      content?: string
    }
  }[]
  usage?: {
    prompt_tokens: number
    completion_tokens: number
    total_tokens: number
  }
}

const DEFAULT_ENDPOINT = "https://open.bigmodel.cn/api/paas/v4/chat/completions"

export class BigModelProvider implements AIProvider {
  readonly name = "bigmodel"
  readonly defaultModel = process.env.GLM_5_MODEL || "glm-4"

  private readonly apiKey: string
  private readonly endpoint: string

  constructor() {
    const apiKey = process.env.GLM_5_API_KEY
    if (!apiKey) {
      throw new AIProviderError("GLM_5_API_KEY is not configured")
    }

    this.apiKey = apiKey
    this.endpoint = process.env.GLM_5_ENDPOINT || DEFAULT_ENDPOINT
  }

  async generate(messages: AIChatMessage[], options: AIProviderOptions = {}): Promise<AIGenerateResult> {
    const response = await fetch(this.endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: options.model || this.defaultModel,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 8000,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new AIProviderError(`BigModel request failed with status ${response.status}`, {
        status: response.status,
        details: errorText,
      })
    }

    const data = (await response.json()) as GLM5Response
    const content = data.choices?.[0]?.message?.content?.trim()

    if (!content) {
      throw new AIProviderError("BigModel returned an empty response")
    }

    return {
      content,
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens,
          }
        : undefined,
    }
  }
}

let singletonProvider: BigModelProvider | null = null

export function getBigModelProvider(): BigModelProvider {
  if (!singletonProvider) {
    singletonProvider = new BigModelProvider()
  }

  return singletonProvider
}

