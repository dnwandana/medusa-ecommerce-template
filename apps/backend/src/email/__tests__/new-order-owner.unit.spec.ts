import { renderTemplate } from "../templates"
import { renderNewOrderOwner } from "../templates/new-order-owner"

const store = { name: "Everyday", contact_email: "hello@everyday.id", whatsapp: null }

const data = {
  store,
  admin_url: "https://api.shop.example.com/app/orders/o_1",
  payment: { label: "Bank transfer, waiting for the receipt", waiting_for_receipt: true },
  order: {
    display_id: 1042,
    created_at: "2026-10-20T07:30:00Z",
    email: "dewi@example.com",
    customer_name: "Dewi Lestari",
    total: 645000,
    shipping_total: 25000,
    shipping_method: "JNE Regular",
    items: [
      { title: "Medusa T-Shirt", variant_title: "M / Black", quantity: 2, unit_price: 150000 },
    ],
    shipping_address: { first_name: "Dewi", city: "Jakarta" },
  },
}

describe("renderNewOrderOwner", () => {
  it("renders the owner alert", () => {
    const { subject, html } = renderNewOrderOwner(data)
    expect(subject).toBe("New order #1042 · Rp 645.000 · waiting for the receipt")
    expect(html).toContain('<html lang="en">')
    expect(html).toContain("Order #1042 · 20 October 2026, 14:30 WIB")
    expect(html).toContain("New order.")
    expect(html).toContain("Dewi Lestari")
    expect(html).toContain("dewi@example.com")
    expect(html).toContain("Bank transfer, waiting for the receipt")
    expect(html).toContain("JNE Regular")
    expect(html).toContain("Open the order")
    expect(html).toContain('href="https://api.shop.example.com/app/orders/o_1"')
    expect(html).toContain("Lines")
    expect(html).toContain("2 × Medusa T-Shirt")
    expect(html).toContain("Ship to")
    expect(html).toContain("Jakarta")
    expect(html).toContain("This is an alert for the store owner")
  })

  it("shows the email alone with no customer name and no address part", () => {
    const { html } = renderNewOrderOwner({
      ...data,
      order: { ...data.order, customer_name: null, shipping_address: null },
    })
    expect(html).toContain("dewi@example.com")
    expect(html).not.toContain("Ship to")
  })

  it("escapes the customer text", () => {
    const { html } = renderNewOrderOwner({
      ...data,
      order: { ...data.order, customer_name: "<b>Dewi</b>" },
    })
    expect(html).toContain("&lt;b&gt;Dewi&lt;/b&gt;")
    expect(html).not.toContain("<b>Dewi</b>")
  })

  it("drops the receipt part of the subject for a paid order", () => {
    expect(
      renderNewOrderOwner({
        ...data,
        payment: { label: "Online payment", waiting_for_receipt: false },
      }).subject
    ).toBe("New order #1042 · Rp 645.000")
  })

  it("throws without the fields and is in the map", () => {
    expect(() => renderNewOrderOwner({ store } as any)).toThrow(
      'The "new-order-owner" template needs an order and an admin_url.'
    )
    expect(() => renderNewOrderOwner({ ...data, admin_url: "" })).toThrow(
      'The "new-order-owner" template needs an order and an admin_url.'
    )
    expect(renderTemplate("new-order-owner", data).subject).toBe(
      "New order #1042 · Rp 645.000 · waiting for the receipt"
    )
  })
})
