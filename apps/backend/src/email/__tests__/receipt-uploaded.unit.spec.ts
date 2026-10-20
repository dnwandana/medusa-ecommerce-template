import { renderTemplate } from "../templates"
import { renderReceiptUploaded } from "../templates/receipt-uploaded"

const store = { name: "Everyday", contact_email: "hello@everyday.id", whatsapp: null }

const data = {
  store,
  order: { display_id: 1042 },
  file_name: "bukti-transfer.jpg",
  receipt_count: 1,
  amount_due: 645000,
  admin_url: "https://api.shop.example.com/app/orders/o_1",
}

describe("renderReceiptUploaded", () => {
  it("renders the alert", () => {
    const { subject, html } = renderReceiptUploaded(data)
    expect(subject).toBe("Receipt uploaded for order #1042")
    expect(html).toContain("bukti-transfer.jpg")
    expect(html).toContain("1 of 3")
    expect(html).toContain("Rp 645.000")
    expect(html).toContain('href="https://api.shop.example.com/app/orders/o_1"')
    expect(html).toContain("This is an alert for the store owner")
    expect(html).not.toContain("<img")
  })

  // Review Focus: the email shows a hostile file name as text.
  it("shows the file name as text", () => {
    const { html } = renderReceiptUploaded({
      ...data,
      file_name: "<img src=x onerror=alert(1)>.png",
    })
    expect(html).not.toContain("<img src=x")
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;.png")
  })

  it("has no link to the receipt file", () => {
    expect(renderReceiptUploaded(data).html).not.toContain("payment-receipts")
  })

  it("throws without the fields", () => {
    expect(() => renderReceiptUploaded({ store } as any)).toThrow(
      'The "receipt-uploaded" template needs an order and an admin_url.'
    )
  })

  it("is a known template", () => {
    expect(renderTemplate("receipt-uploaded", data).subject).toBe(
      "Receipt uploaded for order #1042"
    )
  })
})
