import { renderTemplate } from "../templates"
import { renderPaymentConfirmed } from "../templates/payment-confirmed"

const store = { name: "Everyday", contact_email: "hello@everyday.id", whatsapp: null, phone: null }

const data = {
  locale: "en-US" as const,
  store,
  order_url: "https://shop.example.com/orders/o_1",
  payment: {
    amount: 645000,
    captured_at: "2026-10-21T03:05:00Z",
    method: "bank_transfer" as const,
  },
  order: {
    display_id: 1042,
    created_at: "2026-10-20T07:30:00Z",
    first_name: "Dewi",
    total: 645000,
    shipping_total: 25000,
    shipping_method: "JNE Regular",
    items: [
      { title: "Medusa T-Shirt", variant_title: "M / Black", quantity: 2, unit_price: 150000 },
    ],
  },
}

describe("renderPaymentConfirmed", () => {
  it("renders the confirmation", () => {
    const { subject, html } = renderPaymentConfirmed(data)
    expect(subject).toBe("We received your payment for order #1042")
    expect(html).toContain("Order #1042 · 21 October 2026")
    expect(html).toContain("Payment received.")
    expect(html).toContain("Thank you, Dewi. We confirmed your bank transfer.")
    expect(html).toContain("21 October 2026, 10:05 WIB")
    expect(html).toContain("<strong>Rp 645.000</strong>")
    expect(html).toContain("Bank transfer")
    expect(html).toContain("View your order")
    expect(html).toContain('href="https://shop.example.com/orders/o_1"')
    expect(html).toContain("Your order")
    expect(html).toContain("2 × Medusa T-Shirt")
  })

  it("renders the intro with no name", () => {
    const { html } = renderPaymentConfirmed({ ...data, order: { ...data.order, first_name: " " } })
    expect(html).toContain("Thank you. We confirmed your bank transfer.")
  })

  it("renders Indonesian with the other method", () => {
    const { subject, html } = renderPaymentConfirmed({
      ...data,
      locale: "id-ID",
      payment: { ...data.payment, method: "other" },
      order: { ...data.order, first_name: null },
    })
    expect(subject).toBe("Pembayaran pesanan #1042 kami terima")
    expect(html).toContain("10.05 WIB")
    expect(html).toContain("Pembayaran diterima.")
    expect(html).toContain("pembayaran Anda")
    expect(html).not.toContain("transfer bank")
  })

  it("throws without the fields and is in the map", () => {
    expect(() => renderPaymentConfirmed({ order: {} } as any)).toThrow(
      'The "payment-confirmed" template needs an order and a payment.'
    )
    expect(() => renderPaymentConfirmed({} as any)).toThrow(
      'The "payment-confirmed" template needs an order and a payment.'
    )
    expect(renderTemplate("payment-confirmed", data).subject).toBe(
      "We received your payment for order #1042"
    )
  })
})
