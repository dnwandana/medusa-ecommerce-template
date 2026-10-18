import { renderTemplate } from "../templates"
import { renderOrderShipped } from "../templates/order-shipped"

const data = {
  order_url: "https://shop.example.com/orders/order_123",
  order: {
    display_id: 24117,
    shipping_address: {
      first_name: "Sari",
      last_name: "Wulandari",
      address_1: "Jl. Kemang Raya No. 12",
      city: "Jakarta Selatan",
      postal_code: "12730",
      phone: "+62 812 3456 7890",
    },
  },
  shipment: {
    shipped_at: "2026-10-20T03:00:00.000Z",
    option_name: "Standard Shipping",
    items: [
      { title: "Relaxed Linen Shirt", variant_title: "Sand / M", quantity: 1 },
      { title: "Canvas Market Tote", variant_title: null, quantity: 2 },
    ],
    labels: [
      { tracking_number: "JP1234567890", tracking_url: "https://track.example.com/JP1234567890" },
    ],
  },
}

describe("renderOrderShipped", () => {
  it("uses the display id in the subject and the title", () => {
    const { subject, html } = renderOrderShipped(data)
    expect(subject).toBe("Your order #24117 is on its way")
    expect(html).toContain("<h1>Your order #24117 is on its way</h1>")
  })

  it("gives the ship date in Jakarta time and the shipping option", () => {
    expect(renderOrderShipped(data).html).toContain(
      "We shipped your order on 20 October 2026 with Standard Shipping."
    )
  })

  it("shows the tracking number and the track button for an https URL", () => {
    const { html } = renderOrderShipped(data)
    expect(html).toContain("Tracking number: JP1234567890")
    expect(html).toContain('href="https://track.example.com/JP1234567890"')
    expect(html).toContain("Track your parcel")
  })

  it("shows only the number for a URL that is not https", () => {
    const http = {
      ...data,
      shipment: {
        ...data.shipment,
        labels: [{ tracking_number: "JP1", tracking_url: "http://track.example.com/JP1" }],
      },
    }
    const { html } = renderOrderShipped(http)
    expect(html).toContain("Tracking number: JP1")
    expect(html).not.toContain("Track your parcel")
    expect(html).not.toContain("http://track.example.com")
  })

  it("has no tracking part with no tracking number", () => {
    const none = {
      ...data,
      shipment: { ...data.shipment, labels: [{ tracking_number: " ", tracking_url: null }] },
    }
    const { html } = renderOrderShipped(none)
    expect(html).not.toContain("Tracking")
  })

  it("lists the items of the shipment with no prices", () => {
    const { html } = renderOrderShipped(data)
    expect(html).toContain("In this shipment")
    expect(html).toContain("1 × Relaxed Linen Shirt (Sand / M)")
    expect(html).toContain("2 × Canvas Market Tote")
    expect(html).not.toContain("Canvas Market Tote (")
    expect(html).not.toContain("Rp")
  })

  it("shows the address and the order link", () => {
    const { html } = renderOrderShipped(data)
    expect(html).toContain("Ship to")
    expect(html).toContain("Jl. Kemang Raya No. 12")
    expect(html).toContain('href="https://shop.example.com/orders/order_123"')
    expect(html).toContain("View your order")
  })

  it("leaves out the option name when it is missing", () => {
    const noOption = { ...data, shipment: { ...data.shipment, option_name: null } }
    expect(renderOrderShipped(noOption).html).toContain("We shipped your order on 20 October 2026.")
  })

  it("escapes the values", () => {
    const evil = {
      ...data,
      shipment: { ...data.shipment, items: [{ title: "<b>x</b>", quantity: 1 }] },
    }
    expect(renderOrderShipped(evil).html).toContain("&lt;b&gt;x&lt;/b&gt;")
  })

  it("throws with no shipment", () => {
    expect(() => renderOrderShipped({ ...data, shipment: undefined } as any)).toThrow(
      'The "order-shipped" template needs a shipment.'
    )
  })

  it("is registered as order-shipped", () => {
    expect(renderTemplate("order-shipped", data).subject).toBe("Your order #24117 is on its way")
  })
})
