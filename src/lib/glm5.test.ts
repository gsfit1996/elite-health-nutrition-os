import { describe, expect, it } from "vitest"
import { hashPrompt } from "@/lib/glm5"

describe("hashPrompt", () => {
  it("is deterministic for identical input", () => {
    const a = hashPrompt("same input")
    const b = hashPrompt("same input")
    expect(a).toBe(b)
  })

  it("changes when input changes", () => {
    const a = hashPrompt("input one")
    const b = hashPrompt("input two")
    expect(a).not.toBe(b)
  })

  it("returns a sha256 hex string", () => {
    const hash = hashPrompt("hello")
    expect(hash).toMatch(/^[a-f0-9]{64}$/)
  })
})

