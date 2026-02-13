import { defineConfig } from "vitest/config"
import { fileURLToPath } from "url"

const rootPath = fileURLToPath(new URL("./src", import.meta.url))

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html"],
    },
  },
  resolve: {
    alias: {
      "@": rootPath,
    },
  },
})

