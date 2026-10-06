import { renderPaidCartAlert } from "../templates/paid-cart-alert"
import { renderTemplate } from "../templates"

const data = {
  cart_id: "cart_01",
  invoice_id: "inv_1",
  customer_email: "buyer@example.com",
  amount: 95000,
}

describe("renderPaidCartAlert", () => {
  it("uses the cart id in the subject", () => {
    expect(renderPaidCartAlert(data).subject).toBe("Paid cart with no order: cart_01")
  })

  it("shows the cart id, the invoice id, the email address, and the amount", () => {
    const { html } = renderPaidCartAlert(data)

    expect(html).toContain("cart_01")
    expect(html).toContain("inv_1")
    expect(html).toContain("buyer@example.com")
    expect(html).toContain("Rp 95.000")
  })

  it("renders an alert with no customer email address", () => {
    const { html } = renderPaidCartAlert({ ...data, customer_email: undefined })

    expect(html).toContain("No email address on the cart")
    expect(html).not.toContain("undefined")
  })

  it("escapes HTML characters in the values", () => {
    const { html } = renderPaidCartAlert({ ...data, customer_email: "<b>@example.com" })

    expect(html).toContain("&lt;b&gt;@example.com")
    expect(html).not.toContain("<b>@example.com")
  })

  it.each([
    ["no data", undefined],
    ["no cart id", { ...data, cart_id: "" }],
    ["no invoice id", { ...data, invoice_id: undefined }],
    ["an amount that is not a number", { ...data, amount: "95000" }],
  ])("stops for %s", (_name, value) => {
    expect(() => renderPaidCartAlert(value as any)).toThrow(
      'The "paid-cart-alert" template needs cart_id, invoice_id, and amount.'
    )
  })
})

describe("renderTemplate", () => {
  it("renders the paid-cart-alert template", () => {
    expect(renderTemplate("paid-cart-alert", data).subject).toBe("Paid cart with no order: cart_01")
  })
})
