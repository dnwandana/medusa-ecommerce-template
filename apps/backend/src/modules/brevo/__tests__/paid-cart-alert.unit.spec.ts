import { renderPaidCartAlert } from "../templates/paid-cart-alert"
import { renderTemplate } from "../templates"

const data = {
  cart_id: "cart_01",
  provider_id: "pp_test_test",
  payment_reference: "ref-1",
  customer_email: "buyer@example.com",
  amount: 95000,
}

describe("renderPaidCartAlert", () => {
  it("uses the cart id in the subject", () => {
    expect(renderPaidCartAlert(data).subject).toBe("Paid cart with no order: cart_01")
  })

  it("shows the cart id, the email address, and the amount", () => {
    const { html } = renderPaidCartAlert(data)

    expect(html).toContain("cart_01")
    expect(html).toContain("buyer@example.com")
    expect(html).toContain("Rp 95.000")
  })

  it("shows the provider id and the payment reference and names no gateway", () => {
    const { html } = renderPaidCartAlert(data)
    expect(html).toContain("pp_test_test")
    expect(html).toContain("ref-1")
    expect(html).not.toMatch(/mayar|invoice/i)
  })

  it("throws when a required value is missing", () => {
    expect(() => renderPaidCartAlert({ ...data, payment_reference: "" })).toThrow(
      'The "paid-cart-alert" template needs cart_id, provider_id, payment_reference, and amount.'
    )
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
    ["no provider id", { ...data, provider_id: undefined }],
    ["no payment reference", { ...data, payment_reference: undefined }],
    ["an amount that is not a number", { ...data, amount: "95000" }],
  ])("stops for %s", (_name, value) => {
    expect(() => renderPaidCartAlert(value as any)).toThrow(
      'The "paid-cart-alert" template needs cart_id, provider_id, payment_reference, and amount.'
    )
  })
})

describe("renderTemplate", () => {
  it("renders the paid-cart-alert template", () => {
    expect(renderTemplate("paid-cart-alert", data).subject).toBe("Paid cart with no order: cart_01")
  })
})
