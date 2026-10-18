import { fileURLToPath } from "node:url"
import { defineVitestProject } from "@nuxt/test-utils/config"
import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    projects: [
      {
        // The same `~` alias as Nuxt, so a unit test can import from `~/utils`.
        resolve: { alias: { "~": fileURLToPath(new URL("./app", import.meta.url)) } },
        test: {
          name: "unit",
          include: ["test/unit/**/*.test.ts"],
          environment: "node",
        },
      },
      await defineVitestProject({
        test: {
          name: "nuxt",
          include: ["test/nuxt/**/*.test.ts"],
          environment: "nuxt",
        },
      }),
    ],
  },
})
