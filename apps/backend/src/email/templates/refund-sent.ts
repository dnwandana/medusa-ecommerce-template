import { formatRupiah, formatWibDate, formatWibTime, RenderedEmail } from "./html"
import { type EmailLocale, t } from "./i18n"
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

export type RefundSentData = {
  locale: EmailLocale
  store: EmailStore
  order_url: string
  refund: {
    amount: number
    // ISO time of the refund.
    created_at: string
    reason?: string | null
    note?: string | null
    // The subscriber maps the provider id to the method, so the template names no provider.
    method: "bank_transfer" | "other"
  }
  // created_at is the ISO time of the order.
  order: { display_id: number; created_at: string }
}

// Returns the email that tells the customer that the store sent a refund.
export function renderRefundSent(data: RefundSentData): RenderedEmail {
  const order = data?.order
  const refund = data?.refund
  if (!order || !refund) {
    throw new Error('The "refund-sent" template needs an order and a refund.')
  }

  const { locale, store } = data
  const n = order.display_id
  const amount = formatRupiah(refund.amount)
  // t does not escape, and the subject is plain text, so the subject has no HTML entities.
  const subject = t(locale, "refundSent.subject", { amount, n })
  const intro =
    refund.method === "bank_transfer"
      ? t(locale, "refundSent.bank", { amount })
      : t(locale, "refundSent.other", { amount })
  const reason = typeof refund.reason === "string" ? refund.reason.trim() : ""
  const note = typeof refund.note === "string" ? refund.note.trim() : ""

  const body = [
    eyebrow(
      t(locale, "refundSent.eyebrow", {
        n,
        date: formatWibDate(new Date(order.created_at), locale),
      })
    ),
    heading(t(locale, "refundSent.heading")),
    paragraph(intro),
    keyValues([
      { label: t(locale, "refundSent.amount"), value: amount, strong: true },
      {
        label: t(locale, "refundSent.sent"),
        value: formatWibTime(new Date(refund.created_at), locale),
      },
      ...(reason ? [{ label: t(locale, "refundSent.reason"), value: reason }] : []),
    ]),
    // quote escapes the note before it changes the line breaks to <br>.
    note ? quote(note) : "",
    button(data.order_url, t(locale, "common.viewOrder")),
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
