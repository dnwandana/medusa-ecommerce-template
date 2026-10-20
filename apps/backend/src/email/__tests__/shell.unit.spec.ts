import {
  address,
  button,
  callout,
  eyebrow,
  heading,
  isHttpsUrl,
  keyValues,
  list,
  orderLines,
  paragraph,
  paragraphHtml,
  part,
  productRows,
  quote,
  renderShell,
  textLink,
} from "../templates/shell"

const store = {
  name: "Everyday",
  contact_email: "hello@everyday.id",
  whatsapp: "+62 812 0000 0000",
}
const base = {
  locale: "en-US" as const,
  store,
  title: "Order #1042 confirmed",
  preheader: "We received your order.",
  body: "<p>x</p>",
  audience: "customer" as const,
}

describe("renderShell", () => {
  it("renders the document parts", () => {
    const html = renderShell(base)
    expect(html).toContain('<html lang="en"')
    expect(html).toContain("<title>Order #1042 confirmed</title>")
    expect(html).toContain("We received your order.")
    expect(html).toContain("Everyday")
    expect(html).toContain("#2b2825")
    expect(html).toContain("fonts.googleapis.com")
    expect(html).toContain("@media")
    expect(html).toContain(
      "Questions? Reply to this email, write to hello@everyday.id, or WhatsApp us at +62 812 0000 0000."
    )
  })
  it("drops the empty contact parts", () => {
    expect(renderShell({ ...base, store: { ...store, contact_email: null } })).toContain(
      "Questions? Reply to this email, or WhatsApp us at +62 812 0000 0000."
    )
    expect(
      renderShell({ ...base, store: { ...store, contact_email: null, whatsapp: null } })
    ).toContain("Questions? Reply to this email.")
  })
  it("renders Indonesian", () => {
    const html = renderShell({ ...base, locale: "id-ID" })
    expect(html).toContain('<html lang="id"')
    expect(html).toContain(
      "Ada pertanyaan? Balas email ini, tulis ke hello@everyday.id, atau WhatsApp kami di +62 812 0000 0000."
    )
  })
  it("renders the owner footer", () => {
    expect(renderShell({ ...base, audience: "owner" })).toContain(
      "This is an alert for the store owner from the Everyday backend."
    )
  })
  it("escapes the title and the store name", () => {
    expect(renderShell({ ...base, title: "<b>", store: { ...store, name: "A&B" } })).toContain(
      "A&amp;B"
    )
  })
})
describe("blocks", () => {
  it("escape their text", () => {
    expect(eyebrow("<x>")).toContain("&lt;x&gt;")
    expect(heading("<x>")).toContain("&lt;x&gt;")
    expect(part("<x>")).toContain("&lt;x&gt;")
    expect(paragraph("<x>", true)).toContain("#665e55")
    expect(callout("<x>")).toContain("#9a2b20")
    expect(quote("a<\nb")).toContain("a&lt;<br>b")
    expect(keyValues([{ label: "Amount", value: "Rp 1", strong: true }])).toContain(
      "<strong>Rp 1</strong>"
    )
    expect(button("https://x/?a=1&b=2", "Go <")).toContain('href="https://x/?a=1&amp;b=2"')
    expect(textLink("https://x", "See")).toContain(">See</a>")
  })

  it("list escapes each item and uses the body font and colour", () => {
    const html = list(["Track <orders>", "Save addresses"])
    expect(html).toContain("<li")
    expect(html).toContain("Track &lt;orders&gt;")
    expect(html).toContain("Save addresses")
    expect(html).toContain("'Instrument Sans'")
    expect(html).toContain("color:#1d1b18")
  })

  it("paragraphHtml keeps the HTML and uses the paragraph styles", () => {
    const link = textLink("https://x", "See")
    expect(paragraphHtml(link)).toContain(`${link}</p>`)
    expect(paragraphHtml(link)).toContain("color:#1d1b18")
    expect(paragraphHtml(link, true)).toContain("#665e55")
  })

  it("isHttpsUrl accepts only an https URL", () => {
    expect(isHttpsUrl("https://track.example/1")).toBe(true)
    expect(isHttpsUrl("http://track.example/1")).toBe(false)
    expect(isHttpsUrl("javascript:alert(1)")).toBe(false)
    expect(isHttpsUrl("not a url")).toBe(false)
    expect(isHttpsUrl(null)).toBe(false)
  })
})
describe("tables", () => {
  const items = [
    { title: "Medusa T-Shirt", variant_title: "M / Black", quantity: 2, unit_price: 150000 },
    { title: "Medusa Sweatpants", variant_title: "L", quantity: 1, unit_price: 320000 },
  ]
  it("renders the order lines with the totals", () => {
    const html = orderLines({
      locale: "en-US",
      items,
      shipping: { method: "JNE Regular", amount: 25000 },
      total: 645000,
    })
    expect(html).toContain("2 × Medusa T-Shirt")
    expect(html).toContain("Rp 300.000")
    expect(html).toContain("Shipping · JNE Regular")
    expect(html).toContain("Rp 25.000")
    expect(html).toContain("Rp 645.000")
  })
  it("renders no amounts without a price", () => {
    const html = orderLines({
      locale: "en-US",
      items: items.map(({ unit_price: _unitPrice, ...i }) => i),
    })
    expect(html).not.toContain("Rp ")
    expect(html).not.toContain("Total")
  })
  it("uses the Indonesian labels", () => {
    expect(
      orderLines({ locale: "id-ID", items, shipping: { method: null, amount: 0 }, total: 1 })
    ).toContain("Ongkir")
  })
  it("renders product rows", () => {
    const html = productRows([
      {
        title: "A",
        variant_title: "L",
        thumbnail: "https://cdn/x.jpg",
        price: "Rp 256.000",
        old_price: "Rp 320.000",
      },
      { title: "B", thumbnail: "javascript:alert(1)" },
    ])
    expect(html).toContain('src="https://cdn/x.jpg"')
    expect(html).not.toContain("javascript:")
    expect(html).toContain("<s>Rp 320.000</s>")
  })
  it("renders the address lines that exist", () => {
    const html = address("en-US", {
      first_name: "Dewi",
      last_name: "Lestari",
      address_1: "Jl. Kemang Raya No. 12",
      city: "Jakarta Selatan",
      postal_code: "12730",
    })
    expect(html).toContain("Ship to")
    expect(html).toContain("Dewi Lestari<br>Jl. Kemang Raya No. 12<br>Jakarta Selatan 12730")
    expect(address("id-ID", { city: "Bandung" })).toContain("Kirim ke")
  })
})
