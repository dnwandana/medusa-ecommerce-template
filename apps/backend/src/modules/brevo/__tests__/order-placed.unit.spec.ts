import { renderOrderPlaced } from "../templates/order-placed"
import { renderTemplate } from "../templates"

const data = {
  order_url: "https://shop.example.com/orders/order_123",
  order: {
    display_id: 42,
    email: "buyer@example.com",
    total: 320000,
    shipping_total: 20000,
    items: [
      { title: "Plain T-Shirt", variant_title: "M", quantity: 2, unit_price: 150000 },
      { title: "Canvas Tote Bag", variant_title: null, quantity: 1, unit_price: 85000 },
    ],
    shipping_address: {
      first_name: "Budi",
      last_name: "Santoso",
      address_1: "Jl. Sudirman No. 1",
      city: "Jakarta",
      postal_code: "10220",
      phone: "081234567890",
    },
  },
}

describe("renderOrderPlaced", () => {
  it("uses the display id in the subject", () => {
    expect(renderOrderPlaced(data).subject).toBe("Order #42 confirmed")
  })

  it("lists each item with quantity, variant, and line total", () => {
    const { html } = renderOrderPlaced(data)
    expect(html).toContain("2 × Plain T-Shirt (M)")
    expect(html).toContain("Rp 300.000")
    expect(html).toContain("1 × Canvas Tote Bag")
    expect(html).not.toContain("Canvas Tote Bag (")
    expect(html).toContain("Rp 85.000")
  })

  it("shows the shipping price, the total, the address, and the order link", () => {
    const { html } = renderOrderPlaced(data)
    expect(html).toContain("Shipping: Rp 20.000")
    expect(html).toContain("Total: Rp 320.000")
    expect(html).toContain("Budi Santoso")
    expect(html).toContain("Jl. Sudirman No. 1")
    expect(html).toContain("Jakarta 10220")
    expect(html).toContain('href="https://shop.example.com/orders/order_123"')
  })

  it("renders an order with no shipping address", () => {
    const { html } = renderOrderPlaced({
      ...data,
      order: { ...data.order, shipping_address: null },
    })
    expect(html).toContain("Total: Rp 320.000")
    expect(html).not.toContain("Ship to")
  })

  // Review Focus: HTML characters in customer and product text.
  it("escapes HTML characters in the item title and the address", () => {
    const { html } = renderOrderPlaced({
      ...data,
      order: {
        ...data.order,
        items: [
          { title: "<script>alert(1)</script>", variant_title: "A&B", quantity: 1, unit_price: 1000 },
        ],
        shipping_address: { ...data.order.shipping_address, first_name: "<b>Budi</b>" },
      },
    })
    expect(html).not.toContain("<script>")
    expect(html).toContain("&lt;script&gt;alert(1)&lt;/script&gt; (A&amp;B)")
    expect(html).toContain("&lt;b&gt;Budi&lt;/b&gt;")
  })

  it("stops when the order is absent", () => {
    expect(() => renderOrderPlaced({ order_url: "x" } as any)).toThrow(
      'The "order-placed" template needs an order.'
    )
  })
})

describe("renderTemplate", () => {
  it("renders the order-placed template", () => {
    expect(renderTemplate("order-placed", data).subject).toBe("Order #42 confirmed")
  })

  it("renders the password-reset template", () => {
    expect(
      renderTemplate("password-reset", { reset_url: "https://shop.example.com/r" }).subject
    ).toBe("Reset your password")
  })

  it("stops for an unknown template", () => {
    expect(() => renderTemplate("newsletter", {})).toThrow(
      "Unknown email template: newsletter"
    )
    expect(() => renderTemplate("constructor", {})).toThrow(
      "Unknown email template: constructor"
    )
    expect(() => renderTemplate("toString", {})).toThrow("Unknown email template: toString")
  })
})
