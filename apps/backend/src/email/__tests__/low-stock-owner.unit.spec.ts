import { renderTemplate } from "../templates"
import { renderLowStockOwner } from "../templates/low-stock-owner"

const store = { name: "Everyday", contact_email: "hello@everyday.id", whatsapp: null, phone: null }

const data = {
  store,
  admin_url: "https://api.shop.example.com/app/products/prod_1",
  threshold: 5,
  product_title: "Medusa T-Shirt",
  variant_title: "M / Black",
  sku: "SHIRT-M-BLACK",
  available: 3,
}

describe("renderLowStockOwner", () => {
  it("renders the alert", () => {
    const { subject, html } = renderLowStockOwner(data)
    expect(subject).toBe("Low stock: Medusa T-Shirt, M / Black (3 left)")
    expect(html).toContain("Running low.")
    expect(html).toContain("The stock of a variant crossed the low stock threshold (5).")
    expect(html).toContain("M / Black")
    expect(html).toContain("SHIRT-M-BLACK")
    expect(html).toContain("<strong>3</strong>")
    expect(html).toContain("Open the product")
    expect(html).toContain('href="https://api.shop.example.com/app/products/prod_1"')
    expect(html).toContain(
      "You get one email per crossing. A restock above the threshold resets it."
    )
    expect(html).toContain("This is an alert for the store owner")
    expect(html).toContain('lang="en"')
  })

  it("drops the variant from the subject when there is none", () => {
    const { subject, html } = renderLowStockOwner({ ...data, variant_title: null, sku: null })
    expect(subject).toBe("Low stock: Medusa T-Shirt (3 left)")
    expect(html).not.toContain(">Variant<")
    expect(html).not.toContain(">SKU<")
  })

  it("throws without the fields", () => {
    expect(() => renderLowStockOwner({ store } as any)).toThrow(
      'The "low-stock-owner" template needs a product_title and an admin_url.'
    )
  })

  it("is in the template map", () => {
    expect(renderTemplate("low-stock-owner", data).subject).toBe(
      "Low stock: Medusa T-Shirt, M / Black (3 left)"
    )
  })
})
