import { RenderedEmail } from "./html"
import { type EmailLocale, t } from "./i18n"
import type { OrderPlacedBankAccount } from "./order-placed"
import {
  button,
  type EmailStore,
  eyebrow,
  heading,
  keyValues,
  paragraph,
  quote,
  renderShell,
} from "./shell"

export type MorePaymentNeededData = {
  locale: EmailLocale
  store: EmailStore
  order: { display_id: number; first_name: string | null }
  note: string
  order_url: string
  accounts: OrderPlacedBankAccount[]
}

// Returns the email that gives the customer the owner note after "Ask for more".
export function renderMorePaymentNeeded(data: MorePaymentNeededData): RenderedEmail {
  if (!data?.order || typeof data.note !== "string" || !data.order_url) {
    throw new Error('The "more-payment-needed" template needs an order, a note and an order_url.')
  }

  const { locale, store } = data
  const n = data.order.display_id
  const subject = t(locale, "morePayment.subject", { n })
  const name = data.order.first_name?.trim()
  const intro = t(locale, "morePayment.intro", { n })
  const rows = (data.accounts ?? []).flatMap((account) => [
    { label: t(locale, "orderPlaced.bank"), value: account.bank_name },
    { label: t(locale, "orderPlaced.account"), value: account.account_number, strong: true },
    { label: t(locale, "orderPlaced.name"), value: account.account_holder },
  ])

  const body = [
    eyebrow(t(locale, "morePayment.eyebrow", { n })),
    heading(t(locale, "morePayment.heading")),
    paragraph(name ? t(locale, "common.greeting", { name }) : t(locale, "common.greetingNoName")),
    paragraph(intro),
    // quote escapes the note before it changes the line breaks to <br>.
    quote(data.note),
    // With no active account, the box is absent, so the email shows no empty box.
    rows.length ? keyValues(rows) : "",
    paragraph(t(locale, "morePayment.next")),
    button(data.order_url, t(locale, "orderPlaced.upload")),
  ]
    .filter(Boolean)
    .join("\n")

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
