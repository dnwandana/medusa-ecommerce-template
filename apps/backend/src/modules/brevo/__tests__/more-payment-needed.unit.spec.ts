import { renderTemplate } from "../templates"
import { renderMorePaymentNeeded } from "../templates/more-payment-needed"

const data = {
  order: { display_id: 12, first_name: "Sari" },
  note: "Rp 50.000 is missing.\nSend it today.",
  order_url: "https://shop.example.com/orders/order_1",
}

describe("renderMorePaymentNeeded", () => {
  it("renders the subject, the note and the order link", () => {
    const email = renderMorePaymentNeeded(data)
    expect(email.subject).toBe("More payment is needed for order #12")
    expect(email.html).toContain("Hi Sari,")
    expect(email.html).toContain(
      "We checked your receipt for order #12. The store needs more payment."
    )
    expect(email.html).toContain("Rp 50.000 is missing.<br>Send it today.")
    expect(email.html).toContain(
      "Transfer the difference, then upload one more receipt on the order page."
    )
    expect(email.html).toContain('href="https://shop.example.com/orders/order_1"')
    expect(email.html).toContain("Open your order")
  })

  it("escapes the note", () => {
    expect(renderMorePaymentNeeded({ ...data, note: "<script>x</script>" }).html).toContain(
      "&lt;script&gt;x&lt;/script&gt;"
    )
  })

  it("greets a customer with no first name", () => {
    const email = renderMorePaymentNeeded({ ...data, order: { display_id: 12, first_name: null } })
    expect(email.html).toContain("Hi there,")
  })

  it("throws when the order is missing", () => {
    expect(() => renderMorePaymentNeeded({ ...data, order: undefined } as any)).toThrow(
      'The "more-payment-needed" template needs an order, a note and an order_url.'
    )
  })

  it("is a known template", () => {
    expect(renderTemplate("more-payment-needed", data).subject).toBe(
      "More payment is needed for order #12"
    )
  })
})
