import { formatRupiah, formatWibDate, RenderedEmail } from "./html"
import { type EmailLocale, t } from "./i18n"
import {
  address,
  button,
  callout,
  type EmailAddress,
  type EmailLineItem,
  type EmailStore,
  eyebrow,
  heading,
  keyValues,
  orderLines,
  paragraph,
  part,
  renderShell,
} from "./shell"

export type OrderPlacedBankAccount = {
  bank_name: string
  account_number: string
  account_holder: string
}

// The bank details for an unpaid bank transfer order. The subscriber formats the deadline with
// formatWibTime in the order locale, so the template does not read the clock.
export type OrderPlacedBankTransfer = {
  amount: number
  deadline: string
  accounts: OrderPlacedBankAccount[]
}

export type OrderPlacedData = {
  locale: EmailLocale
  store: EmailStore
  order_url: string
  // Only a bank transfer order that is not paid has this value. A gateway order email shows no
  // bank details.
  bank_transfer?: OrderPlacedBankTransfer
  order: {
    display_id: number
    email: string
    // ISO time of the order.
    created_at: string
    total: number
    shipping_total: number
    shipping_method?: string | null
    items: EmailLineItem[]
    shipping_address?: EmailAddress | null
  }
}

// Returns the bank block: the amount, the accounts, the deadline, and the upload button.
function bankTransferBlock(
  locale: EmailLocale,
  bankTransfer: OrderPlacedBankTransfer,
  orderUrl: string
): string {
  const rows = [
    {
      label: t(locale, "orderPlaced.amount"),
      value: formatRupiah(bankTransfer.amount),
      strong: true,
    },
    ...(bankTransfer.accounts ?? []).flatMap((account) => [
      { label: t(locale, "orderPlaced.bank"), value: account.bank_name },
      { label: t(locale, "orderPlaced.account"), value: account.account_number, strong: true },
      { label: t(locale, "orderPlaced.name"), value: account.account_holder },
    ]),
  ]
  return [
    part(t(locale, "orderPlaced.payByTransfer")),
    keyValues(rows),
    callout(t(locale, "orderPlaced.deadline", { deadline: bankTransfer.deadline })),
    button(orderUrl, t(locale, "orderPlaced.upload")),
  ].join("\n")
}

// Returns the order confirmation email for the customer.
export function renderOrderPlaced(data: OrderPlacedData): RenderedEmail {
  const order = data?.order
  if (!order) {
    throw new Error('The "order-placed" template needs an order.')
  }

  const { locale, store } = data
  const n = order.display_id
  const subject = t(locale, "orderPlaced.subject", { n })
  const name = order.shipping_address?.first_name?.trim()
  // An unpaid bank transfer order waits for the payment, so the email does not promise shipping.
  const intro = data.bank_transfer
    ? t(locale, "orderPlaced.introUnpaid")
    : t(locale, "orderPlaced.introPaid")

  const body = [
    eyebrow(
      t(locale, "orderPlaced.eyebrow", {
        n,
        date: formatWibDate(new Date(order.created_at), locale),
      })
    ),
    heading(
      name ? t(locale, "orderPlaced.heading", { name }) : t(locale, "orderPlaced.headingNoName")
    ),
    paragraph(intro),
    data.bank_transfer
      ? bankTransferBlock(locale, data.bank_transfer, data.order_url)
      : button(data.order_url, t(locale, "common.viewOrder")),
    part(t(locale, "common.yourOrder")),
    orderLines({
      locale,
      items: order.items ?? [],
      shipping: { method: order.shipping_method ?? null, amount: order.shipping_total },
      total: order.total,
    }),
    order.shipping_address ? address(locale, order.shipping_address) : "",
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
