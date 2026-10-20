import { renderPasswordReset } from "../templates/password-reset"

const store = { name: "Everyday", contact_email: "hello@everyday.id", whatsapp: null }

describe("renderPasswordReset", () => {
  it("renders the reset email", () => {
    const { subject, html } = renderPasswordReset({
      store,
      reset_url: "https://api.shop.example.com/app/reset-password?token=t&email=a%40b",
    })
    expect(subject).toBe("Reset your password")
    expect(html).toContain(
      'href="https://api.shop.example.com/app/reset-password?token=t&amp;email=a%40b"'
    )
    expect(html).toContain("Set a new password")
    expect(html).toContain("The link expires in 15 minutes.")
    expect(html).toContain("This is an alert for the store owner")
  })

  it("throws without a reset_url", () => {
    expect(() => renderPasswordReset({ store } as any)).toThrow(
      'The "password-reset" template needs a reset_url.'
    )
  })
})
