interface GammaGenerateResponse {
  id: string
  status: string
  gammaUrl?: string
  exportUrls?: {
    pdf?: string
    pptx?: string
  }
  error?: string
}

interface GammaGenerationResult {
  generationId: string
  status: string
  gammaUrl?: string
  exportUrl?: string
  error?: string
}

export async function startGammaGeneration(markdown: string): Promise<GammaGenerationResult> {
  const apiKey = process.env.GAMMA_API_KEY

  if (!apiKey) {
    throw new Error("GAMMA_API_KEY is not configured")
  }

  // Add section breaks for better card splitting
  const formattedMarkdown = markdown.replace(
    /^(#{1,3}\s)/gm,
    "\n---\n$1"
  )

  const response = await fetch("https://public-api.gamma.app/v1.0/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-KEY": apiKey,
    },
    body: JSON.stringify({
      inputText: formattedMarkdown,
      textMode: "preserve",
      format: "document",
      cardSplit: "inputTextBreaks",
      numCards: 30,
      imageOptions: { source: "noImages" },
      exportAs: "pdf",
      additionalInstructions: "Keep formatting clean. Preserve headings. Use a professional, minimal style.",
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    console.error("Gamma API error:", errorText)
    throw new Error(`Gamma API error: ${response.status} - ${errorText}`)
  }

  const data: GammaGenerateResponse = await response.json()

  return {
    generationId: data.id,
    status: data.status || "pending",
    gammaUrl: data.gammaUrl,
    exportUrl: data.exportUrls?.pdf,
    error: data.error,
  }
}

export async function pollGammaStatus(generationId: string): Promise<GammaGenerationResult> {
  const apiKey = process.env.GAMMA_API_KEY

  if (!apiKey) {
    throw new Error("GAMMA_API_KEY is not configured")
  }

  const response = await fetch(
    `https://public-api.gamma.app/v1.0/generations/${generationId}`,
    {
      headers: {
        "X-API-KEY": apiKey,
        accept: "application/json",
      },
    }
  )

  if (!response.ok) {
    const errorText = await response.text()
    console.error("Gamma API poll error:", errorText)
    throw new Error(`Gamma API poll error: ${response.status} - ${errorText}`)
  }

  const data: GammaGenerateResponse = await response.json()

  return {
    generationId: data.id,
    status: data.status,
    gammaUrl: data.gammaUrl,
    exportUrl: data.exportUrls?.pdf,
    error: data.error,
  }
}

export async function waitForGammaCompletion(
  generationId: string,
  maxAttempts: number = 60,
  intervalMs: number = 5000
): Promise<GammaGenerationResult> {
  let attempts = 0

  while (attempts < maxAttempts) {
    const result = await pollGammaStatus(generationId)

    if (result.status === "completed") {
      return result
    }

    if (result.status === "failed") {
      throw new Error(result.error || "Gamma generation failed")
    }

    // Wait before next poll
    await new Promise((resolve) => setTimeout(resolve, intervalMs))
    attempts++
  }

  throw new Error("Gamma generation timed out")
}
