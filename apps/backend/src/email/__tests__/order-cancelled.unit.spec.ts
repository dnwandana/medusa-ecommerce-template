import { renderTemplate } from "../templates"
import { renderOrderCancelled } from "../templates/order-cancelled"

const store = { name: "Everyday", contact_email: "hello@everyday.id", whatsapp: null }

const order = {
  display_id: 1042,
  created_at: "2026-10-21T07:30:00Z",
  total: 645000,
  shipping_total: 25000,
  shipping_method: "JNE Regular",
  items: [{ title: "Medusa T-Shirt", variant_title: "M / Black", quantity: 2, unit_price: 150000 }],
}
const base = { locale: "en-US" as const, store, shop_url: "https://shop.example.com", order }

describe("renderOrderCancelled", () => {
  it("renders the timeout wording", () => {
    const { subject, html } = renderOrderCancelled({ ...base, reason: "payment_timeout" })
    expect(subject).toBe("Order #1042 is cancelled")
    expect(html).toContain("We did not get your payment within 24 hours")
    expect(html).toContain("If you still want the items, place the order again.")
    expect(html).toContain("Shop again")
    expect(html).toContain('href="https://shop.example.com"')
    expect(html).toContain("The cancelled order")
    expect(html).toContain("Rp 645.000")
    expect(html).not.toContain("refund")
  })

  it("never shows a refund line for the timeout wording", () => {
    const { html } = renderOrderCancelled({
      ...base,
      reason: "payment_timeout",
      note: "A note",
      refund: { amount: 645000, method: "bank_transfer" },
    })
    expect(html).not.toContain("refund")
    expect(html).not.toContain("A note")
  })

  it("renders the staff wording with the note and the bank refund line", () => {
    const { html } = renderOrderCancelled({
      ...base,
      reason: "staff",
      note: "Out of stock.\nSorry!",
      refund: { amount: 645000, method: "bank_transfer" },
    })
    expect(html).toContain("A note from the store:")
    expect(html).toContain("Out of stock.<br>Sorry!")
    expect(html).toContain(
      "We refund Rp 645.000 to the account you paid from within two working days."
    )
  })

  it("escapes the note", () => {
    const { html } = renderOrderCancelled({ ...base, reason: "staff", note: "<b>x</b>" })
    expect(html).toContain("&lt;b&gt;x&lt;/b&gt;")
    expect(html).not.toContain("<b>x</b>")
  })

  it("renders the plain staff wording and the gateway line", () => {
    const { html } = renderOrderCancelled({
      ...base,
      reason: "staff",
      refund: { amount: 1, method: "gateway" },
    })
    expect(html).toContain("Contact us if you have questions.")
    expect(html).toContain("The refund comes in a separate email.")
  })

  it("renders the plain staff wording for a note of only spaces", () => {
    const { html } = renderOrderCancelled({ ...base, reason: "staff", note: "   " })
    expect(html).toContain("Contact us if you have questions.")
    expect(html).not.toContain("A note from the store:")
    expect(html).not.toContain("refund")
  })

  it("renders Indonesian", () => {
    const { subject, html } = renderOrderCancelled({
      ...base,
      locale: "id-ID",
      reason: "payment_timeout",
    })
    expect(subject).toBe("Pesanan #1042 dibatalkan")
    expect(html).toContain("Belanja lagi")
    expect(html).toContain("Pesanan yang dibatalkan")
    expect(html).toContain("21 Oktober 2026")
  })

  it("throws without an order and is in the map", () => {
    expect(() => renderOrderCancelled({} as any)).toThrow(
      'The "order-cancelled" template needs an order.'
    )
    expect(renderTemplate("order-cancelled", { ...base, reason: "staff" }).subject).toBe(
      "Order #1042 is cancelled"
    )
  })
})
