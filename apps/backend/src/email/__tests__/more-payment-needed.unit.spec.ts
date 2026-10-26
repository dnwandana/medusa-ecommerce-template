import { renderMorePaymentNeeded } from "../templates/more-payment-needed"

const store = { name: "Everyday", contact_email: "hello@everyday.id", whatsapp: null, phone: null }

const data = {
  locale: "en-US" as const,
  store,
  order: { display_id: 1042, first_name: "Dewi" },
  note: "Rp 600.000 came in.\nSend Rp 45.000 more.",
  order_url: "https://shop.example.com/orders/o_1",
  accounts: [
    { bank_name: "Sample Bank", account_number: "123 456 7890", account_holder: "PT Toko Contoh" },
  ],
}

describe("renderMorePaymentNeeded", () => {
  it("renders the note, the accounts and the button", () => {
    const { subject, html } = renderMorePaymentNeeded(data)
    expect(subject).toBe("More payment is needed for order #1042")
    expect(html).toContain("Hi Dewi,")
    expect(html).toContain("Rp 600.000 came in.<br>Send Rp 45.000 more.")
    expect(html).toContain("<strong>123 456 7890</strong>")
    expect(html).toContain("Upload the receipt")
  })
  it("escapes the note and greets without a name", () => {
    const { html } = renderMorePaymentNeeded({
      ...data,
      note: "<img>",
      order: { display_id: 1, first_name: null },
      accounts: [],
    })
    expect(html).toContain("&lt;img&gt;")
    expect(html).toContain("Hi there,")
    expect(html).not.toContain("Sample Bank")
  })
  it("renders Indonesian", () => {
    expect(renderMorePaymentNeeded({ ...data, locale: "id-ID" }).subject).toBe(
      "Pesanan #1042 butuh pembayaran tambahan"
    )
  })
  it("throws without the fields", () => {
    expect(() => renderMorePaymentNeeded({ order: {} } as any)).toThrow(
      'The "more-payment-needed" template needs an order, a note and an order_url.'
    )
  })
})
