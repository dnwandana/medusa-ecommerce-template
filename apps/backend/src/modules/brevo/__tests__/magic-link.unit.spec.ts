import { renderTemplate } from "../templates"
import { emailButton } from "../templates/html"
import { renderMagicLink } from "../templates/magic-link"

const data = {
  store_name: "Everyday",
  first_name: "Sari",
  sign_in_url: "https://shop.example.com/account/sign-in/verify?id=mlr_1&token=abc",
  browser: "Chrome on Windows",
  requested_at: "2026-10-18T07:32:00.000Z",
}

describe("magic-link template", () => {
  it("has the subject and the text of the spec", () => {
    const { subject, html } = renderMagicLink(data)
    expect(subject).toBe("Sign in to Everyday")
    expect(html).toContain("<p>Hi Sari,</p>")
    expect(html).toContain("Click the button to sign in to Everyday.")
    expect(html).toContain("The link works one time. It expires in 15 minutes.")
    expect(html).toContain("Request: Chrome on Windows, 18 October 2026, 14:32 WIB.")
    expect(html).toContain(
      "If you did not ask to sign in, ignore this email. Nobody can sign in without this link."
    )
    expect(html).toContain(
      'href="https://shop.example.com/account/sign-in/verify?id=mlr_1&amp;token=abc"'
    )
  })

  it("greets with Hi there when there is no first name", () => {
    expect(renderMagicLink({ ...data, first_name: "  " }).html).toContain("<p>Hi there,</p>")
    expect(renderMagicLink({ ...data, first_name: null }).html).toContain("<p>Hi there,</p>")
  })

  it("escapes the values", () => {
    const { html } = renderMagicLink({ ...data, first_name: "<b>Sari</b>" })
    expect(html).toContain("Hi &lt;b&gt;Sari&lt;/b&gt;,")
  })

  it("needs a link and a store name", () => {
    expect(() => renderMagicLink({ ...data, sign_in_url: "" })).toThrow(
      'The "magic-link" template needs a sign_in_url.'
    )
    expect(() => renderMagicLink({ ...data, store_name: "" })).toThrow(
      'The "magic-link" template needs a store_name.'
    )
  })

  it("is in the template map", () => {
    expect(renderTemplate("magic-link", data).subject).toBe("Sign in to Everyday")
  })
})

describe("emailButton", () => {
  it("makes an escaped dark link", () => {
    const html = emailButton("https://a.example/?x=1&y=2", "Sign <in>")
    expect(html).toContain('href="https://a.example/?x=1&amp;y=2"')
    expect(html).toContain("background:#1d1b18")
    expect(html).toContain(">Sign &lt;in&gt;</a>")
  })
})
