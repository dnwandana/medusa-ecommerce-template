import { renderTemplate } from "../templates"
import { renderOrderDelivered } from "../templates/order-delivered"

const store = { name: "Everyday", contact_email: "hello@everyday.id", whatsapp: null, phone: null }

const data = {
  locale: "en-US" as const,
  store,
  order_url: "https://shop.example.com/orders/o_1",
  order: { display_id: 1042 },
  delivery: {
    delivered_at: "2026-10-24T05:00:00Z",
    items: [{ title: "Medusa T-Shirt", variant_title: "M / Black", quantity: 2 }],
  },
}

describe("renderOrderDelivered", () => {
  it("renders the delivery", () => {
    const { subject, html } = renderOrderDelivered(data)
    expect(subject).toBe("Your order #1042 is delivered")
    expect(html).toContain("Order #1042 · 24 October 2026")
    expect(html).toContain("Delivered.")
    expect(html).toContain("Your parcel arrived on 24 October 2026.")
    expect(html).toContain("View your order")
    expect(html).toContain("In this delivery")
    expect(html).toContain("2 × Medusa T-Shirt")
    expect(html).toContain("reply to this email within 7 days")
    expect(html).not.toContain("Rp ")
  })

  it("shows no prices when the items carry a unit price", () => {
    const { html } = renderOrderDelivered({
      ...data,
      delivery: {
        ...data.delivery,
        items: [{ title: "Medusa T-Shirt", quantity: 1, unit_price: 150000 }],
      },
    })
    expect(html).not.toContain("Rp ")
  })

  it("renders Indonesian", () => {
    const { subject, html } = renderOrderDelivered({ ...data, locale: "id-ID" })
    expect(subject).toBe("Pesanan #1042 sudah sampai")
    expect(html).toContain("Sudah sampai.")
    expect(html).toContain("Dalam kiriman ini")
    expect(html).toContain("24 Oktober 2026")
  })

  it("throws without the fields and is in the map", () => {
    expect(() => renderOrderDelivered({ order: {} } as any)).toThrow(
      'The "order-delivered" template needs an order and a delivery.'
    )
    expect(renderTemplate("order-delivered", data).subject).toBe("Your order #1042 is delivered")
  })
})
