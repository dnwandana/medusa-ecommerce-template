import { escapeHtml, formatRupiah, layout } from "../templates/html"
import { renderPasswordReset } from "../templates/password-reset"

describe("escapeHtml", () => {
  it("escapes the five HTML characters", () => {
    expect(escapeHtml(`<a href="x">Tom & 'Jerry'</a>`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;Tom &amp; &#39;Jerry&#39;&lt;/a&gt;"
    )
  })

  it("returns an empty string for null and undefined", () => {
    expect(escapeHtml(null)).toBe("")
    expect(escapeHtml(undefined)).toBe("")
  })
})

describe("formatRupiah", () => {
  it("formats whole rupiah with dots and no decimals", () => {
    expect(formatRupiah(150000)).toBe("Rp 150.000")
    expect(formatRupiah(1500000)).toBe("Rp 1.500.000")
    expect(formatRupiah(500)).toBe("Rp 500")
    expect(formatRupiah(0)).toBe("Rp 0")
  })

  it("accepts a numeric string and an object with valueOf", () => {
    expect(formatRupiah("20000")).toBe("Rp 20.000")
    expect(formatRupiah({ valueOf: () => 85000 })).toBe("Rp 85.000")
  })

  it("returns Rp 0 for a value that is not a number", () => {
    expect(formatRupiah(undefined)).toBe("Rp 0")
    expect(formatRupiah("abc")).toBe("Rp 0")
  })
})

describe("layout", () => {
  it("puts the escaped title and the body in an HTML document", () => {
    const html = layout("A & B", "<p>Body</p>")
    expect(html).toContain("<!doctype html>")
    expect(html).toContain("<h1>A &amp; B</h1>")
    expect(html).toContain("<p>Body</p>")
  })
})

describe("renderPasswordReset", () => {
  const url = "https://shop.example.com/account/reset-password?token=abc&email=a%40b.com"

  it("returns the subject and a link to the reset URL", () => {
    const email = renderPasswordReset({ reset_url: url })
    expect(email.subject).toBe("Reset your password")
    expect(email.html).toContain(
      'href="https://shop.example.com/account/reset-password?token=abc&amp;email=a%40b.com"'
    )
    expect(email.html).toContain("This link expires in 15 minutes.")
  })

  it("stops when the reset URL is absent", () => {
    expect(() => renderPasswordReset({} as any)).toThrow(
      'The "password-reset" template needs a reset_url.'
    )
  })
})
