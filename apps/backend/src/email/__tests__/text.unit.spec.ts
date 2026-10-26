import { renderTemplate } from "../templates"
import { htmlToText } from "../text"

describe("htmlToText", () => {
  it("drops the head, the style block, and the hidden preheader", () => {
    const html =
      "<html><head><title>T</title><style>.a{color:red}</style></head><body>" +
      '<div style="display:none;max-height:0">Preheader</div><p>Hello</p></body></html>'
    expect(htmlToText(html)).toBe("Hello")
  })

  it("writes a link as its label and its URL, and decodes &amp; in the URL", () => {
    const html = '<a href="https://shop.test/verify?id=1&amp;token=abc">Sign in</a>'
    expect(htmlToText(html)).toBe("Sign in: https://shop.test/verify?id=1&token=abc")
  })

  it("writes a link only once when the label is the URL", () => {
    expect(htmlToText('<a href="https://shop.test">https://shop.test</a>')).toBe(
      "https://shop.test"
    )
  })

  it("puts block elements on new lines and list items after a dash", () => {
    expect(htmlToText("<p>One</p><p>Two<br>Three</p><ul><li>A</li><li>B</li></ul>")).toBe(
      "One\n\nTwo\nThree\n\n- A\n- B"
    )
  })

  it("decodes the entities that escapeHtml writes, and numeric entities", () => {
    expect(
      htmlToText("<p>&lt;b&gt; &quot;x&quot; &#39;y&#39; &amp; &#8211; &#x2014;&nbsp;z</p>")
    ).toBe("<b> \"x\" 'y' & – — z")
  })

  it("keeps the magic link of a rendered email usable", () => {
    const url = "https://shop.test/account/sign-in/verify?id=req_1&token=tok_2"
    const { html } = renderTemplate("magic-link", {
      locale: "en-US",
      store: { name: "Everyday", contact_email: null, whatsapp: null, phone: null },
      sign_in_url: url,
      // The template type requires these two fields.
      browser: "Firefox on Linux",
      requested_at: "2026-10-20T03:00:00.000Z",
    })
    const text = htmlToText(html)
    expect(text).toContain(url)
    expect(text).not.toMatch(/<[a-z!/]/i)
    expect(text).not.toContain("{")
  })
})
