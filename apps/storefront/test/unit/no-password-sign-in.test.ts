import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { extname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

const root = fileURLToPath(new URL("../../", import.meta.url))

// Returns all files below the directory that have one of the extensions.
function listFiles(dir: string, extensions: string[]): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) {
      return listFiles(path, extensions)
    }
    return extensions.includes(extname(path)) ? [path] : []
  })
}

const removed = [
  "app/pages/account/login.vue",
  "app/pages/account/register.vue",
  "app/pages/account/forgot-password.vue",
  "app/pages/account/reset-password.vue",
  "app/components/AuthPanel.vue",
  "app/components/PasswordInput.vue",
]

describe("no password sign-in", () => {
  it.each(removed)("%s does not exist", (file) => {
    expect(existsSync(join(root, file))).toBe(false)
  })

  it("no source file names a password page or emailpass", () => {
    const hits = listFiles(join(root, "app"), [".vue", ".ts"]).filter((file) =>
      /\/account\/(login|register|forgot-password|reset-password)|emailpass|AuthPanel|PasswordInput/.test(
        readFileSync(file, "utf8")
      )
    )
    expect(hits).toEqual([])
  })
})
