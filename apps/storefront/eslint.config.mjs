import prettier from "eslint-config-prettier"
// @nuxt/eslint generates the base config in .nuxt/eslint.config.mjs when `nuxt prepare` runs.
import withNuxt from "./.nuxt/eslint.config.mjs"

export default withNuxt(
  {
    // The shadcn-vue CLI generates these files. Do not lint them.
    ignores: ["app/components/ui/**", ".vitest/**"],
  },
  {
    // The test mocks hold partial objects, so they need `any`.
    files: ["test/**"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
    },
  },
  // Prettier does the formatting. This turns off the ESLint rules that conflict with Prettier.
  prettier
)
