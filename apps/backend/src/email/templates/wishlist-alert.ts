import { formatRupiah, RenderedEmail } from "./html"
import { type EmailLocale, t } from "./i18n"
import {
  button,
  type EmailStore,
  heading,
  paragraph,
  part,
  productRows,
  renderShell,
} from "./shell"

export type WishlistAlertItem = {
  title: string
  variant_title: string | null
  thumbnail: string | null
  price: number
  // Only a price drop has the old price.
  old_price?: number | null
}

export type WishlistAlertData = {
  locale: EmailLocale
  store: EmailStore
  wishlist_url: string
  first_name: string | null
  back_in_stock: WishlistAlertItem[]
  price_drops: WishlistAlertItem[]
}

// Returns the email that tells the customer about wishlist items that are back in stock or that
// have a lower price. A group with no items gets no part.
export function renderWishlistAlert(data: WishlistAlertData): RenderedEmail {
  const stock = Array.isArray(data?.back_in_stock) ? data.back_in_stock : []
  const drops = Array.isArray(data?.price_drops) ? data.price_drops : []
  if (stock.length === 0 && drops.length === 0) {
    throw new Error('The "wishlist-alert" template needs at least one item.')
  }

  const { locale, store } = data
  // t does not escape, and the subject is plain text, so the title has no HTML entities here.
  const subject = stock.length
    ? t(locale, "wishlist.subjectStock", { product: stock[0].title })
    : t(locale, "wishlist.subjectPrice", { product: drops[0].title })
  const title = t(locale, "wishlist.heading")

  const stockRows = stock.map((item) => ({
    title: item.title,
    variant_title: item.variant_title,
    thumbnail: item.thumbnail,
    price: formatRupiah(item.price),
  }))
  // productRows strikes through the old price.
  const dropRows = drops.map((item) => ({
    title: item.title,
    variant_title: item.variant_title,
    thumbnail: item.thumbnail,
    price: formatRupiah(item.price),
    old_price: typeof item.old_price === "number" ? formatRupiah(item.old_price) : null,
  }))

  const body = [
    heading(title),
    stockRows.length ? `${part(t(locale, "wishlist.backInStock"))}\n${productRows(stockRows)}` : "",
    dropRows.length ? `${part(t(locale, "wishlist.priceDrop"))}\n${productRows(dropRows)}` : "",
    button(data.wishlist_url, t(locale, "wishlist.button")),
    paragraph(t(locale, "wishlist.why"), true),
  ]
    .filter(Boolean)
    .join("\n")

  return {
    subject,
    html: renderShell({
      locale,
      store,
      title: subject,
      preheader: subject,
      body,
      audience: "customer",
    }),
  }
}
