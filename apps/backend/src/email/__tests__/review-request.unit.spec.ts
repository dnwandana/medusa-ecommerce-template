import { renderTemplate } from "../templates"
import { renderReviewRequest } from "../templates/review-request"

const store = { name: "Everyday", contact_email: "hello@everyday.id", whatsapp: null, phone: null }

const data = {
  locale: "en-US" as const,
  store,
  review_url: "https://shop.example.com/account/orders",
  first_name: "Dewi",
  order: { display_id: 1042 },
  products: [
    { title: "Medusa T-Shirt", variant_title: "M / Black", thumbnail: "https://cdn/x.jpg" },
    { title: "Medusa Sweatpants", variant_title: "L", thumbnail: null },
  ],
}

describe("renderReviewRequest", () => {
  it("renders the request", () => {
    const { subject, html } = renderReviewRequest(data)
    expect(subject).toBe("How is your Medusa T-Shirt?")
    expect(html).toContain("Order #1042")
    expect(html).toContain("A week in. What do you think?")
    expect(html).toContain("Hi Dewi, your order arrived a week ago.")
    expect(html).toContain('src="https://cdn/x.jpg"')
    expect(html).toContain("Medusa Sweatpants")
    expect(html).toContain("Write a review")
    expect(html).toContain('href="https://shop.example.com/account/orders"')
    expect(html).toContain("once per order")
  })

  it("renders the intro with no name", () => {
    const { html } = renderReviewRequest({ ...data, first_name: null })
    expect(html).toContain("Your order arrived a week ago.")
    expect(html).not.toContain("Hi ")
  })

  it("shows no prices", () => {
    const { html } = renderReviewRequest({
      ...data,
      products: [{ title: "Medusa T-Shirt", price: "Rp 150.000", old_price: "Rp 200.000" }],
    })
    expect(html).not.toContain("Rp ")
  })

  it("keeps the subject plain and escapes the title in the body", () => {
    const { subject, html } = renderReviewRequest({
      ...data,
      products: [{ title: "Tee & <Co>" }],
    })
    expect(subject).toBe("How is your Tee & <Co>?")
    expect(html).toContain("Tee &amp; &lt;Co&gt;")
    expect(html).not.toContain("<Co>")
  })

  it("renders Indonesian", () => {
    const { subject, html } = renderReviewRequest({ ...data, locale: "id-ID" })
    expect(subject).toBe("Bagaimana Medusa T-Shirt Anda?")
    expect(html).toContain("Tulis ulasan")
  })

  it("throws without products and is in the map", () => {
    expect(() => renderReviewRequest({ ...data, products: [] })).toThrow(
      'The "review-request" template needs an order and at least one product.'
    )
    expect(() => renderReviewRequest({} as any)).toThrow("at least one product")
    expect(renderTemplate("review-request", data).subject).toBe("How is your Medusa T-Shirt?")
  })
})
