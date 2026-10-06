import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const css = readFileSync(new URL("../../app/assets/css/tailwind.css", import.meta.url), "utf8")
const pkg = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8"))

// Returns the body of one @utility block.
const utility = (name: string) => css.match(new RegExp(`@utility ${name} \\{([\\s\\S]*?)\\n\\}`))?.[1] ?? ""

describe("design type", () => {
  it("loads the two fonts from fontsource and not from Google", () => {
    expect(css).toContain('@import "@fontsource-variable/bricolage-grotesque"')
    expect(css).toContain('@import "@fontsource-variable/instrument-sans"')
    expect(css).not.toContain("fonts.googleapis.com")
    expect(css).toMatch(/--font-heading:\s*"Bricolage Grotesque Variable"/)
    expect(css).toMatch(/--font-sans:\s*"Instrument Sans Variable"/)
  })

  it.each([
    ["text-display", "56px", "60px", "700", "38px", "42px"],
    ["text-h1", "40px", "46px", "650", "28px", "34px"],
    ["text-h2", "30px", "36px", "650", "24px", "30px"],
    ["text-h3", "22px", "28px", "600", "20px", "26px"],
  ])("%s is %s/%s %s and %s/%s below md", (name, size, line, weight, smallSize, smallLine) => {
    const body = utility(name)
    expect(body).toContain(`font-size: ${smallSize}`)
    expect(body).toContain(`line-height: ${smallLine}`)
    expect(body).toContain(`font-weight: ${weight}`)
    expect(body).toMatch(new RegExp(`@variant md \\{[\\s\\S]*font-size: ${size};[\\s\\S]*line-height: ${line};`))
    expect(body).toContain("font-family: var(--font-heading)")
  })

  it.each([
    ["text-h4", "18px", "24px"],
    ["text-body-lg", "18px", "28px"],
    ["text-body-sm", "14px", "20px"],
    ["text-caption", "12px", "16px"],
    ["text-price", "16px", "24px"],
    ["text-price-lg", "24px", "32px"],
  ])("%s is %s/%s", (name, size, line) => {
    expect(utility(name)).toContain(`font-size: ${size}`)
    expect(utility(name)).toContain(`line-height: ${line}`)
  })

  it("uses tabular numbers for the prices", () => {
    expect(utility("text-price")).toContain("font-variant-numeric: tabular-nums")
    expect(utility("text-price-lg")).toContain("font-variant-numeric: tabular-nums")
  })

  it("sets the Lucide stroke width", () => {
    expect(css).toMatch(/\.lucide\s*\{\s*stroke-width:\s*1\.75/)
  })

  it("installs the font and icon packages", () => {
    expect(pkg.dependencies).toHaveProperty("@lucide/vue")
    expect(pkg.dependencies).toHaveProperty("@fontsource-variable/bricolage-grotesque")
    expect(pkg.dependencies).toHaveProperty("@fontsource-variable/instrument-sans")
  })
})
