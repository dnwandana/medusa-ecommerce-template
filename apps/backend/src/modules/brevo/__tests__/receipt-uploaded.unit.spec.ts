import { renderTemplate } from "../templates"
import { renderReceiptUploaded } from "../templates/receipt-uploaded"

const data = {
  order: { display_id: 12 },
  file_name: "bukti.png",
  receipt_count: 2,
  admin_url: "https://api.example.com/app/orders/order_1",
}

describe("renderReceiptUploaded", () => {
  it("renders the subject, the count and the admin link", () => {
    const email = renderReceiptUploaded(data)
    expect(email.subject).toBe("Receipt uploaded for order #12")
    expect(email.html).toContain("The customer uploaded a receipt for order #12.")
    expect(email.html).toContain("File: bukti.png")
    expect(email.html).toContain("2 of 3 receipts")
    expect(email.html).toContain('href="https://api.example.com/app/orders/order_1"')
    expect(email.html).toContain("Open the order")
  })

  // Review Focus: the email shows a hostile file name as text.
  it("shows the file name as text", () => {
    const email = renderReceiptUploaded({
      ...data,
      file_name: "<img src=x onerror=alert(1)>.png",
      receipt_count: 1,
    })
    expect(email.html).not.toContain("<img src=x")
    expect(email.html).toContain("&lt;img src=x onerror=alert(1)&gt;.png")
  })

  it("has no link to the receipt file", () => {
    expect(renderReceiptUploaded(data).html).not.toContain("payment-receipts")
  })

  it("throws when the order is missing", () => {
    expect(() => renderReceiptUploaded({ ...data, order: undefined } as any)).toThrow(
      'The "receipt-uploaded" template needs an order and an admin_url.'
    )
  })

  it("is a known template", () => {
    expect(renderTemplate("receipt-uploaded", data).subject).toBe("Receipt uploaded for order #12")
  })
})
