import { RenderedEmail } from "./html"
import { type EmailLocale, t } from "./i18n"
import {
  button,
  type EmailProductRow,
  type EmailStore,
  eyebrow,
  heading,
  paragraph,
  productRows,
  renderShell,
} from "./shell"

export type ReviewRequestData = {
  locale: EmailLocale
  store: EmailStore
  review_url: string
  first_name: string | null
  order: { display_id: number }
  // Only the products that the customer has not reviewed.
  products: EmailProductRow[]
}

// Returns the email that asks the customer to review the products of a delivered order.
export function renderReviewRequest(data: ReviewRequestData): RenderedEmail {
  const order = data?.order
  const products = Array.isArray(data?.products) ? data.products : []
  if (!order || products.length === 0) {
    throw new Error('The "review-request" template needs an order and at least one product.')
  }

  const { locale, store } = data
  // t does not escape, and the subject is plain text, so the title has no HTML entities here.
  // The body helpers escape the title.
  const subject = t(locale, "reviewRequest.subject", { product: products[0].title })
  const name = data.first_name?.trim()
  const intro = name
    ? t(locale, "reviewRequest.intro", { name })
    : t(locale, "reviewRequest.introNoName")

  // A review request shows no prices, so the rows keep only the title, the variant, and the
  // thumbnail.
  const rows = products.map((product) => ({
    title: product.title,
    variant_title: product.variant_title,
    thumbnail: product.thumbnail,
  }))

  const body = [
    eyebrow(t(locale, "reviewRequest.eyebrow", { n: order.display_id })),
    heading(t(locale, "reviewRequest.heading")),
    paragraph(intro),
    productRows(rows),
    button(data.review_url, t(locale, "reviewRequest.button")),
    paragraph(t(locale, "reviewRequest.once"), true),
  ].join("\n")

  return {
    subject,
    html: renderShell({
      locale,
      store,
      title: subject,
      preheader: intro,
      body,
      audience: "customer",
    }),
  }
}
