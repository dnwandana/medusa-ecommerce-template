import js from "@eslint/js"
import { defineConfig } from "eslint/config"
import prettier from "eslint-config-prettier"
import globals from "globals"
import tseslint from "typescript-eslint"

export default defineConfig(
  {
    // MikroORM generates the migrations.
    ignores: [".medusa/**", "static/**", "src/modules/*/migrations/**"],
  },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      globals: globals.node,
    },
    rules: {
      // The Medusa base classes and the query.graph results use `any`, and the test mocks need it.
      "@typescript-eslint/no-explicit-any": "off",
      // A leading underscore marks a parameter that the Medusa interface requires but the code
      // does not use.
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_", caughtErrorsIgnorePattern: "^_" },
      ],
    },
  },
  {
    // jest.config.js and the test setup are CommonJS files.
    files: ["**/*.js"],
    languageOptions: {
      sourceType: "commonjs",
      globals: globals.node,
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
  // Prettier does the formatting. This turns off the ESLint rules that conflict with Prettier.
  prettier
)
