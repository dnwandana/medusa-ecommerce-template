import { renderMagicLink } from "../templates/magic-link"

const store = { name: "Everyday", contact_email: "hello@everyday.id", whatsapp: null }

const data = {
  locale: "en-US" as const,
  store,
  first_name: "Dewi",
  sign_in_url: "https://shop.example.com/account/sign-in/verify?id=r_1&token=t",
  browser: "Chrome on Android",
  requested_at: "2026-10-20T07:30:00Z",
}

describe("renderMagicLink", () => {
  it("renders the link email", () => {
    const { subject, html } = renderMagicLink(data)
    expect(subject).toBe("Sign in to Everyday")
    expect(html).toContain("Hi Dewi, click the button to sign in to Everyday.")
    expect(html).toContain(
      'href="https://shop.example.com/account/sign-in/verify?id=r_1&amp;token=t"'
    )
    expect(html).toContain("Chrome on Android")
    expect(html).toContain("20 October 2026, 14:30 WIB")
    expect(html).toContain("Nobody can sign in without this link.")
  })
  it("renders Indonesian", () => {
    const { subject, html } = renderMagicLink({ ...data, locale: "id-ID", first_name: null })
    expect(subject).toBe("Masuk ke Everyday")
    expect(html).toContain("14.30 WIB")
  })
  it("throws without a sign_in_url", () => {
    expect(() => renderMagicLink({ store } as any)).toThrow(
      'The "magic-link" template needs a sign_in_url.'
    )
  })
})
