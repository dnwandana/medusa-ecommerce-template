import { renderEmail } from "../render"
import { renderTemplate } from "../templates"
import { htmlToText } from "../text"

const store = { name: "Everyday", contact_email: null as unknown, whatsapp: null }
const data = { store, reset_url: "https://shop.example.com/reset?token=t" }

describe("renderEmail", () => {
  it("gives the subject, the HTML, and the text of the template", () => {
    const message = renderEmail("password-reset", data)
    const expected = renderTemplate("password-reset", data)
    expect(message.subject).toBe(expected.subject)
    expect(message.html).toBe(expected.html)
    expect(message.text).toBe(htmlToText(expected.html))
  })

  it("replies to the trimmed store contact email", () => {
    const message = renderEmail("password-reset", {
      ...data,
      store: { ...store, contact_email: " hello@shop.example.com " },
    })
    expect(message.replyTo).toBe("hello@shop.example.com")
  })

  it.each([null, "", "   ", 42])("gives no Reply-To for the contact email %p", (contact) => {
    const message = renderEmail("password-reset", {
      ...data,
      store: { ...store, contact_email: contact },
    })
    expect(message.replyTo).toBeUndefined()
  })

  it("throws for an unknown template, as renderTemplate does", () => {
    expect(() => renderEmail("no-such-template", data)).toThrow()
  })
})
