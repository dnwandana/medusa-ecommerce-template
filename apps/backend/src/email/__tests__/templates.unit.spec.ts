import { renderTemplate } from "../templates"

const store = { name: "Everyday", contact_email: null, whatsapp: null, phone: null }

describe("renderTemplate in src/email/templates", () => {
  it("renders the password-reset email", () => {
    const email = renderTemplate("password-reset", {
      store,
      reset_url: "https://shop.example.com/reset?token=t",
    })
    expect(email.subject).not.toBe("")
    expect(email.html.startsWith("<!doctype html>")).toBe(true)
  })

  it("throws for an unknown template", () => {
    expect(() => renderTemplate("nope", {})).toThrow("Unknown email template: nope")
  })

  it("throws for an inherited property name", () => {
    expect(() => renderTemplate("constructor", {})).toThrow("Unknown email template: constructor")
  })
})
