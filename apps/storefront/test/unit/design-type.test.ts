import { existsSync, readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

const css = readFileSync(new URL("../../app/assets/css/tailwind.css", import.meta.url), "utf8")
const pkg = JSON.parse(readFileSync(new URL("../../package.json", import.meta.url), "utf8"))

// Returns the body of one @utility block.
const utility = (name: string) =>
  css.match(new RegExp(`@utility ${name} \\{([\\s\\S]*?)\\n\\}`))?.[1] ?? ""

describe("design type", () => {
  it("declares the self-hosted fonts and no font package", () => {
    expect(css).not.toContain("@fontsource-variable")
    expect(css).not.toContain("fonts.googleapis.com")
    expect(css).toMatch(
      /--font-heading:\s*"Cormorant Garamond", "Cormorant", "EB Garamond", Garamond, "Times New Roman", ui-serif, serif;/
    )
    expect(css).toMatch(
      /--font-sans:\s*"Instrument Sans", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;/
    )
    for (const file of [
      "CormorantGaramond-Variable.woff2",
      "CormorantGaramond-Italic-Variable.woff2",
      "InstrumentSans-Variable.woff2",
    ]) {
      expect(css).toContain(`url("/fonts/${file}") format("woff2")`)
      expect(existsSync(new URL(`../../public/fonts/${file}`, import.meta.url))).toBe(true)
    }
    expect(css.match(/font-display:\s*swap;/g)?.length).toBe(3)
    expect(css).toMatch(/font-weight:\s*300 700;/)
    expect(css).toMatch(/font-weight:\s*400 700;/)
  })

  it.each([
    ["text-display", "76px", "80px", "400", "46px", "50px"],
    ["text-h1", "48px", "54px", "400", "34px", "40px"],
    ["text-h2", "36px", "42px", "400", "28px", "34px"],
    ["text-h3", "26px", "32px", "500", "22px", "28px"],
  ])("%s is %s/%s %s and %s/%s below md", (name, size, line, weight, smallSize, smallLine) => {
    const body = utility(name)
    expect(body).toContain(`font-size: ${smallSize}`)
    expect(body).toContain(`line-height: ${smallLine}`)
    expect(body).toContain(`font-weight: ${weight}`)
    expect(body).toMatch(
      new RegExp(`@variant md \\{[\\s\\S]*font-size: ${size};[\\s\\S]*line-height: ${line};`)
    )
    expect(body).toContain("font-family: var(--font-heading)")
  })

  it.each([
    ["text-h4", "20px", "26px"],
    ["text-eyebrow", "11px", "16px"],
    ["text-nav", "12px", "16px"],
    ["text-button", "12px", "16px"],
    ["text-field-label", "11px", "16px"],
    ["text-body-lg", "18px", "30px"],
    ["text-body", "15px", "24px"],
    ["text-body-sm", "13px", "20px"],
    ["text-caption", "12px", "18px"],
    ["text-price", "13px", "20px"],
    ["text-price-lg", "20px", "28px"],
  ])("%s is %s/%s", (name, size, line) => {
    expect(utility(name)).toContain(`font-size: ${size}`)
    expect(utility(name)).toContain(`line-height: ${line}`)
  })

  it("sets the caps styles", () => {
    expect(utility("text-eyebrow")).toContain("letter-spacing: 0.18em")
    expect(utility("text-button")).toContain("letter-spacing: 0.14em")
    expect(utility("caps")).toContain("text-transform: uppercase")
    expect(utility("caps")).toContain("letter-spacing: 0.14em")
  })

  it("uses tabular numbers for the prices", () => {
    expect(utility("text-price")).toContain("font-variant-numeric: tabular-nums")
    expect(utility("text-price-lg")).toContain("font-variant-numeric: tabular-nums")
  })

  it("sets the Lucide stroke width", () => {
    expect(css).toMatch(/\.lucide\s*\{\s*stroke-width:\s*1\.5/)
  })

  it("installs the icon package and no font package", () => {
    expect(pkg.dependencies).toHaveProperty("@lucide/vue")
    expect(Object.keys(pkg.dependencies)).not.toContain("@fontsource-variable/bricolage-grotesque")
    expect(Object.keys(pkg.dependencies)).not.toContain("@fontsource-variable/instrument-sans")
  })
})
