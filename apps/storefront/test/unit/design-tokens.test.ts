import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const css = readFileSync(new URL("../../app/assets/css/tailwind.css", import.meta.url), "utf8")
const components = JSON.parse(
  readFileSync(new URL("../../components.json", import.meta.url), "utf8")
)

describe("design tokens", () => {
  it.each([
    ["--background", "#f4f1eb"],
    ["--foreground", "#1d1b18"],
    ["--card", "#faf8f4"],
    ["--popover", "#faf8f4"],
    ["--primary", "#2b2825"],
    ["--primary-foreground", "#f4f1eb"],
    ["--primary-hover", "#4a453f"],
    ["--primary-soft", "#e7e1d7"],
    ["--secondary", "#ebe6dd"],
    ["--muted", "#ebe6dd"],
    ["--muted-foreground", "#665e55"],
    ["--accent", "#e5dfd4"],
    ["--destructive", "#9a2b20"],
    ["--destructive-foreground", "#faf8f4"],
    ["--destructive-soft", "#f1e1dc"],
    ["--border", "#dcd5c9"],
    ["--input", "#857d71"],
    ["--ring", "#1d1b18"],
    ["--success", "#3d5733"],
    ["--success-soft", "#e4e7da"],
    ["--warning", "#734d14"],
    ["--warning-soft", "#efe4cf"],
    ["--sale", "#8a2e22"],
    ["--sale-soft", "#f1e2dd"],
    ["--star", "#6f5528"],
    ["--disabled", "#e6e1d8"],
    ["--disabled-foreground", "#958c80"],
    ["--icon-subtle", "#958c80"],
    ["--scrim", "#1d1b1759"],
    ["--link", "var\\(--foreground\\)"],
    ["--backdrop-sand", "#e6dfd2"],
    ["--backdrop-stone", "#dcd9d2"],
    ["--backdrop-sage", "#d8dacf"],
    ["--backdrop-clay", "#e2d6c9"],
    ["--backdrop-sky", "#d8dbdd"],
  ])("sets %s to %s in :root", (name, value) => {
    expect(css).toMatch(new RegExp(`${name}:\\s*${value};`))
  })

  it("maps each new token to a Tailwind colour", () => {
    for (const name of [
      "sale-soft",
      "primary-hover",
      "success-soft",
      "star",
      "backdrop-sky",
      "scrim",
    ]) {
      expect(css).toContain(`--color-${name}: var(--${name});`)
    }
  })

  it("makes all corners square except the full radius", () => {
    for (const name of ["--radius", "--radius-sm", "--radius-md", "--radius-lg", "--radius-xl"]) {
      expect(css).toMatch(new RegExp(`${name}:\\s*0px;`))
    }
    expect(css).toMatch(/--radius-full:\s*9999px;/)
  })

  it("sets the shadows, the focus ring and the layout sizes", () => {
    expect(css).toMatch(/--shadow-sm:\s*none;/)
    expect(css).toMatch(/--shadow-md:\s*0 12px 32px #1d1b1714;/)
    expect(css).toMatch(/--shadow-lg:\s*0 24px 64px #1d1b171f;/)
    expect(css).toMatch(/--focus-ring:\s*0 0 0 2px #f4f1eb, 0 0 0 4px #1d1b18;/)
    expect(css).toMatch(/--content-max:\s*1440px;/)
    expect(css).toMatch(/--text-max:\s*560px;/)
  })

  it("has no dark theme, no sidebar tokens, and no chart tokens", () => {
    expect(css).not.toMatch(/^\.dark\s*\{/m)
    expect(css).not.toContain("--sidebar")
    expect(css).not.toContain("--chart")
  })

  it("names the Everyday base colour in components.json", () => {
    expect(components.style).toBe("reka-nova")
    expect(components.tailwind.baseColor).toBe("stone")
    expect(components.iconLibrary).toBe("lucide")
  })
})
