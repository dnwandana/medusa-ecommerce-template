import { renderOrderPlaced } from "../templates/order-placed"
import { renderTemplate } from "../templates"

const store = { name: "Everyday", contact_email: "hello@everyday.id", whatsapp: null }
const order = {
  display_id: 1042,
  email: "dewi@example.com",
  created_at: "2026-10-20T07:30:00Z",
  total: 645000,
  shipping_total: 25000,
  shipping_method: "JNE Regular",
  items: [{ title: "Medusa T-Shirt", variant_title: "M / Black", quantity: 2, unit_price: 150000 }],
  shipping_address: {
    first_name: "Dewi",
    last_name: "Lestari",
    address_1: "Jl. Kemang Raya No. 12",
    city: "Jakarta Selatan",
    postal_code: "12730",
  },
}
const bank = {
  amount: 645000,
  deadline: "21 October 2026, 14:30 WIB",
  accounts: [
    { bank_name: "Sample Bank", account_number: "123 456 7890", account_holder: "PT Toko Contoh" },
  ],
}
const base = {
  locale: "en-US" as const,
  store,
  order_url: "https://shop.example.com/orders/o_1",
  order,
}

describe("renderOrderPlaced", () => {
  it("renders the unpaid bank transfer email", () => {
    const { subject, html } = renderOrderPlaced({ ...base, bank_transfer: bank })
    expect(subject).toBe("Order #1042 confirmed")
    expect(html).toContain("Order #1042 · 20 October 2026")
    expect(html).toContain("Thank you, Dewi.")
    expect(html).toContain("after we confirm your payment")
    expect(html).toContain("Pay by bank transfer")
    expect(html).toContain("<strong>123 456 7890</strong>")
    expect(html).toContain(
      "before 21 October 2026, 14:30 WIB. We cancel the order after that time."
    )
    expect(html).toContain("Upload the receipt")
    expect(html).toContain("Shipping · JNE Regular")
    expect(html).toContain("Rp 645.000")
    expect(html).toContain("Ship to")
  })
  it("renders the paid email without the bank block", () => {
    const { html } = renderOrderPlaced(base)
    expect(html).not.toContain("Pay by bank transfer")
    expect(html).toContain("View your order")
    expect(html).toContain("send the tracking number by email")
  })
  it("greets without a name and skips the address", () => {
    const { html } = renderOrderPlaced({ ...base, order: { ...order, shipping_address: null } })
    expect(html).toContain("Thank you.")
    expect(html).not.toContain("Ship to")
  })
  it("renders Indonesian", () => {
    const { subject, html } = renderOrderPlaced({
      ...base,
      locale: "id-ID",
      bank_transfer: { ...bank, deadline: "21 Oktober 2026, 14.30 WIB" },
    })
    expect(subject).toBe("Pesanan #1042 diterima")
    expect(html).toContain('lang="id"')
    expect(html).toContain("Terima kasih, Dewi.")
    expect(html).toContain("Unggah bukti transfer")
    expect(html).toContain("Ongkir")
    expect(html).toContain("20 Oktober 2026")
  })
  it("escapes the values", () => {
    expect(
      renderOrderPlaced({
        ...base,
        order: { ...order, items: [{ title: "<b>", quantity: 1, unit_price: 1 }] },
      }).html
    ).toContain("&lt;b&gt;")
  })
  it("throws without an order", () => {
    expect(() => renderOrderPlaced({} as any)).toThrow(
      'The "order-placed" template needs an order.'
    )
  })
  it("is in the template map", () => {
    expect(renderTemplate("order-placed", base).subject).toBe("Order #1042 confirmed")
  })
})
