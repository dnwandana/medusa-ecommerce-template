import { renderTemplate } from "../templates"
import { renderRefundSent } from "../templates/refund-sent"

const store = { name: "Everyday", contact_email: "hello@everyday.id", whatsapp: null }

const data = {
  locale: "en-US" as const,
  store,
  order_url: "https://shop.example.com/orders/o_1",
  refund: {
    amount: 645000,
    created_at: "2026-10-21T08:40:00Z",
    reason: "Item out of stock",
    note: "BCA 123 a.n. Dewi",
    method: "bank_transfer" as const,
  },
  order: { display_id: 1042, created_at: "2026-10-20T07:30:00Z" },
}

describe("renderRefundSent", () => {
  it("renders the refund", () => {
    const { subject, html } = renderRefundSent(data)
    expect(subject).toBe("We refunded Rp 645.000 for order #1042")
    expect(html).toContain("Order #1042 · 20 October 2026")
    expect(html).toContain("Refund sent.")
    expect(html).toContain("We refunded Rp 645.000 to the account you paid from.")
    expect(html).toContain("<strong>Rp 645.000</strong>")
    expect(html).toContain("Item out of stock")
    expect(html).toContain("BCA 123 a.n. Dewi")
    expect(html).toContain("21 October 2026, 15:40 WIB")
    expect(html).toContain("View your order")
  })

  it("renders the other method without a reason or a note", () => {
    const { html } = renderRefundSent({
      ...data,
      refund: { amount: 1, created_at: data.refund.created_at, method: "other" },
    })
    expect(html).toContain("to your payment method")
    expect(html).not.toContain("Reason")
    expect(html).not.toContain("<blockquote")
    expect(html).not.toContain("border-left:3px")
  })

  it("escapes the note before the line breaks become <br>", () => {
    const { html } = renderRefundSent({
      ...data,
      refund: { ...data.refund, note: "<i>a</i>\nb", reason: "<b>r</b>" },
    })
    expect(html).toContain("&lt;i&gt;a&lt;/i&gt;<br>b")
    expect(html).toContain("&lt;b&gt;r&lt;/b&gt;")
  })

  it("renders Indonesian", () => {
    const { subject, html } = renderRefundSent({ ...data, locale: "id-ID" })
    expect(subject).toBe("Pengembalian dana Rp 645.000 untuk pesanan #1042")
    expect(html).toContain("Dana dikembalikan.")
    expect(html).toContain("21 Oktober 2026, 15.40 WIB")
  })

  it("throws without the fields and is in the map", () => {
    expect(() => renderRefundSent({ order: {} } as any)).toThrow(
      'The "refund-sent" template needs an order and a refund.'
    )
    expect(renderTemplate("refund-sent", data).subject).toBe(
      "We refunded Rp 645.000 for order #1042"
    )
  })
})
