import { renderTemplate } from "../templates"
import { renderWishlistAlert } from "../templates/wishlist-alert"

const store = { name: "Everyday", contact_email: "hello@everyday.id", whatsapp: null, phone: null }

const data = {
  locale: "en-US" as const,
  store,
  wishlist_url: "https://shop.example.com/account/wishlist",
  first_name: "Dewi",
  back_in_stock: [
    {
      title: "Medusa T-Shirt",
      variant_title: "M / Black",
      thumbnail: "https://cdn/x.jpg",
      price: 150000,
    },
  ],
  price_drops: [
    {
      title: "Medusa Sweatpants",
      variant_title: "L",
      thumbnail: null,
      price: 256000,
      old_price: 320000,
    },
  ],
}

describe("renderWishlistAlert", () => {
  it("renders both groups", () => {
    const { subject, html } = renderWishlistAlert(data)
    expect(subject).toBe("Back in stock: Medusa T-Shirt")
    expect(html).toContain("Good news from your wishlist.")
    expect(html).toContain("Back in stock")
    expect(html).toContain("Price drop")
    expect(html).toContain('src="https://cdn/x.jpg"')
    expect(html).toContain("Rp 150.000")
    expect(html).toContain("<s>Rp 320.000</s>")
    expect(html).toContain("Rp 256.000")
    expect(html).toContain("Open your wishlist")
    expect(html).toContain('href="https://shop.example.com/account/wishlist"')
    expect(html).toContain("Remove an item from the wishlist to stop alerts for it.")
  })

  it("uses the price subject when only prices dropped", () => {
    const { subject, html } = renderWishlistAlert({ ...data, back_in_stock: [] })
    expect(subject).toBe("Price drop: Medusa Sweatpants")
    expect(html).not.toContain("Back in stock")
    expect(html).toContain("Price drop")
  })

  it("renders no price part when only the stock changed", () => {
    const { subject, html } = renderWishlistAlert({ ...data, price_drops: [] })
    expect(subject).toBe("Back in stock: Medusa T-Shirt")
    expect(html).not.toContain("Price drop")
    expect(html).not.toContain("<s>")
  })

  it("renders Indonesian", () => {
    const { subject, html } = renderWishlistAlert({ ...data, locale: "id-ID" })
    expect(subject).toBe("Stok kembali: Medusa T-Shirt")
    expect(html).toContain('lang="id"')
    expect(html).toContain("Kabar baik dari wishlist Anda.")
    expect(html).toContain("Harga turun")
    expect(html).toContain("Buka wishlist Anda")
  })

  it("renders the Indonesian price subject", () => {
    expect(renderWishlistAlert({ ...data, locale: "id-ID", back_in_stock: [] }).subject).toBe(
      "Harga turun: Medusa Sweatpants"
    )
  })

  it("throws with no items", () => {
    expect(() => renderWishlistAlert({ ...data, back_in_stock: [], price_drops: [] })).toThrow(
      'The "wishlist-alert" template needs at least one item.'
    )
  })

  it("is in the template map", () => {
    expect(renderTemplate("wishlist-alert", data).subject).toBe("Back in stock: Medusa T-Shirt")
  })
})
