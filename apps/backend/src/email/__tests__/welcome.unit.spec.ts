import { renderWelcome } from "../templates/welcome"

const store = { name: "Everyday", contact_email: "hello@everyday.id", whatsapp: null }

describe("renderWelcome", () => {
  it("renders the welcome email", () => {
    const { subject, html } = renderWelcome({
      locale: "en-US",
      store,
      first_name: "Dewi",
      shop_url: "https://shop.example.com",
    })
    expect(subject).toBe("Welcome to Everyday")
    expect(html).toContain("Welcome, Dewi.")
    expect(html).toContain("keep a wishlist")
    expect(html).toContain("Start shopping")
  })
  it("renders Indonesian without a name", () => {
    const { subject, html } = renderWelcome({
      locale: "id-ID",
      store,
      shop_url: "https://shop.example.com",
    })
    expect(subject).toBe("Selamat datang di Everyday")
    expect(html).toContain("Mulai belanja")
  })
  it("throws without a shop_url", () => {
    expect(() => renderWelcome({ store } as any)).toThrow(
      'The "welcome" template needs a shop_url.'
    )
  })
})
