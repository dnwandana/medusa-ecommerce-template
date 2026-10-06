import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const css = readFileSync(new URL("../../app/assets/css/tailwind.css", import.meta.url), "utf8")
const components = JSON.parse(
  readFileSync(new URL("../../components.json", import.meta.url), "utf8")
)

describe("design tokens", () => {
  it.each([
    ["--background", "#faf8f5"],
    ["--foreground", "#1f1b17"],
    ["--card", "#ffffff"],
    ["--popover", "#ffffff"],
    ["--primary", "#24466f"],
    ["--primary-foreground", "#ffffff"],
    ["--primary-hover", "#1a3555"],
    ["--primary-soft", "#e7edf5"],
    ["--secondary", "#f2eee8"],
    ["--muted", "#f2eee8"],
    ["--muted-foreground", "#5f574e"],
    ["--accent", "#ece6dd"],
    ["--destructive", "#b3261e"],
    ["--destructive-foreground", "#ffffff"],
    ["--destructive-soft", "#fbe8e6"],
    ["--border", "#e6e0d7"],
    ["--input", "#8a8177"],
    ["--ring", "#24466f"],
    ["--success", "#2d6a3e"],
    ["--success-soft", "#e5f1e7"],
    ["--warning", "#8a5300"],
    ["--warning-soft", "#fbefd8"],
    ["--sale", "#c0331f"],
    ["--star", "#a86b0c"],
    ["--disabled", "#ebe6df"],
    ["--disabled-foreground", "#8f877d"],
    ["--icon-subtle", "#9a9187"],
    ["--scrim", "#1f1b1766"],
    ["--link", "#24466f"],
    ["--backdrop-sand", "#e9dfd0"],
    ["--backdrop-stone", "#dedad3"],
    ["--backdrop-sage", "#d7ddd0"],
    ["--backdrop-clay", "#e7d4c7"],
    ["--backdrop-sky", "#d8dee6"],
  ])("sets %s to %s in :root", (name, value) => {
    expect(css).toMatch(new RegExp(`${name}:\\s*${value};`))
  })

  it("maps each new token to a Tailwind colour", () => {
    for (const name of ["primary-hover", "success-soft", "star", "backdrop-sky", "scrim"]) {
      expect(css).toContain(`--color-${name}: var(--${name});`)
    }
  })

  it("sets the radii, the shadows, and the focus ring", () => {
    expect(css).toMatch(/--radius:\s*10px;/)
    expect(css).toMatch(/--radius-sm:\s*6px;/)
    expect(css).toMatch(/--radius-md:\s*8px;/)
    expect(css).toMatch(/--radius-lg:\s*10px;/)
    expect(css).toMatch(/--radius-xl:\s*14px;/)
    expect(css).toContain("--shadow-sm: 0 1px 2px #1f1b170f, 0 1px 3px #1f1b170d;")
    expect(css).toContain("--shadow-md: 0 2px 4px #1f1b170d, 0 8px 20px #1f1b1717;")
    expect(css).toContain("--shadow-lg: 0 4px 12px #1f1b1714, 0 24px 48px #1f1b1726;")
    expect(css).toContain("--shadow-focus: 0 0 0 2px #faf8f5, 0 0 0 4px #24466f;")
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
