import { renderOrderShipped } from "../templates/order-shipped"

const store = { name: "Everyday", contact_email: "hello@everyday.id", whatsapp: null, phone: null }

const data = {
  locale: "en-US" as const,
  store,
  order_url: "https://shop.example.com/orders/o_1",
  order: { display_id: 1042, shipping_address: { first_name: "Dewi", city: "Jakarta" } },
  shipment: {
    shipped_at: "2026-10-22T03:15:00Z",
    option_name: "JNE Regular",
    items: [{ title: "Medusa T-Shirt", variant_title: "M / Black", quantity: 2 }],
    labels: [
      { tracking_number: "JNE1234567890", tracking_url: "https://www.jne.co.id/tracking/trace" },
    ],
  },
}

describe("renderOrderShipped", () => {
  it("renders the shipment", () => {
    const { subject, html } = renderOrderShipped(data)
    expect(subject).toBe("Your order #1042 is on its way")
    expect(html).toContain("We shipped your order on 22 October 2026 with JNE Regular.")
    expect(html).toContain("<strong>JNE1234567890</strong>")
    expect(html).toContain("Track your parcel")
    expect(html).toContain('href="https://www.jne.co.id/tracking/trace"')
    expect(html).toContain("In this shipment")
    expect(html).toContain("2 × Medusa T-Shirt")
    expect(html).not.toContain("Rp ")
  })
  it("shows no track button for an http or a javascript URL", () => {
    for (const url of ["http://x", "javascript:alert(1)", null]) {
      const { html } = renderOrderShipped({
        ...data,
        shipment: { ...data.shipment, labels: [{ tracking_number: "A", tracking_url: url }] },
      })
      expect(html).not.toContain("Track your parcel")
      expect(html).toContain("View your order")
    }
  })
  it("renders Indonesian", () => {
    const { subject, html } = renderOrderShipped({ ...data, locale: "id-ID" })
    expect(subject).toBe("Pesanan #1042 sedang dikirim")
    expect(html).toContain("22 Oktober 2026")
    expect(html).toContain("Dalam kiriman ini")
  })
  it("throws without an order or a shipment", () => {
    expect(() => renderOrderShipped({} as any)).toThrow(
      'The "order-shipped" template needs an order.'
    )
    expect(() => renderOrderShipped({ order: {} } as any)).toThrow(
      'The "order-shipped" template needs a shipment.'
    )
  })
})
