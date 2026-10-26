import { renderTemplate } from "../templates"
import { renderPaidCartAlert } from "../templates/paid-cart-alert"

const store = { name: "Everyday", contact_email: "hello@everyday.id", whatsapp: null, phone: null }

const data = {
  store,
  cart_id: "cart_1",
  provider_id: "pp_x_x",
  payment_reference: "REF",
  amount: 645000,
}

describe("renderPaidCartAlert", () => {
  it("renders the alert", () => {
    const { subject, html } = renderPaidCartAlert(data)
    expect(subject).toBe("Paid cart with no order: cart_1")
    expect(html).toContain("No email address on the cart")
    expect(html).toContain("<strong>Rp 645.000</strong>")
    expect(html).toContain("This is an alert for the store owner")
  })

  it("shows the provider id and the payment reference and names no gateway", () => {
    const { html } = renderPaidCartAlert(data)
    expect(html).toContain("pp_x_x")
    expect(html).toContain("REF")
    expect(html).not.toMatch(/invoice/i)
  })

  it("shows and escapes the customer email address", () => {
    const { html } = renderPaidCartAlert({ ...data, customer_email: "<b>@example.com" })
    expect(html).toContain("&lt;b&gt;@example.com")
    expect(html).not.toContain("<b>@example.com")
    expect(html).not.toContain("No email address on the cart")
  })

  it("throws without the fields", () => {
    expect(() => renderPaidCartAlert({ store, cart_id: "c" } as any)).toThrow(
      "needs cart_id, provider_id, payment_reference, and amount"
    )
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

  it("is a known template", () => {
    expect(renderTemplate("paid-cart-alert", data).subject).toBe("Paid cart with no order: cart_1")
  })
})
