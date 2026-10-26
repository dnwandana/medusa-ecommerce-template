import { escapeHtml, formatRupiah } from "./html"
import { type EmailLocale, langOf, t } from "./i18n"

export type EmailStore = {
  name: string
  contact_email: string | null
  whatsapp: string | null
  phone: string | null
}

export type EmailAudience = "customer" | "owner"

export type EmailAddress = {
  first_name?: string | null
  last_name?: string | null
  address_1?: string | null
  city?: string | null
  postal_code?: string | null
  phone?: string | null
}

export type EmailLineItem = {
  title: string
  variant_title?: string | null
  quantity: number
  unit_price?: number | null
}

export type EmailProductRow = {
  title: string
  variant_title?: string | null
  thumbnail?: string | null
  price?: string | null
  old_price?: string | null
}

export type ShellInput = {
  locale: EmailLocale
  store: EmailStore
  title: string
  preheader: string
  body: string
  audience: EmailAudience
}

// The colours of option E. Every element carries its colour inline, because many mail clients
// remove the <style> block.
const INK = "#1d1b18"
const MUTED = "#665e55"
const HAIRLINE = "#dcd5c9"
const PAPER = "#faf8f4"
const BACKDROP = "#ebe9e4"
const BAR = "#2b2825"
const BAR_TEXT = "#f4f1eb"
const BOX = "#f4f1eb"
const CALLOUT = "#f1e1dc"
const CALLOUT_TEXT = "#9a2b20"
const THUMB = "#e2d6c9"

// Gmail and Outlook ignore web fonts, so each stack ends in a font that every client has. The
// names use single quotation marks, because the stacks go into style attributes.
const SERIF = "'Cormorant Garamond', Georgia, 'Times New Roman', serif"
const SANS = "'Instrument Sans', Helvetica, Arial, sans-serif"

const FONT_LINKS = [
  "https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600&display=swap",
  "https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;500;600&display=swap",
]

// The inline styles give the desktop sizes. The media query gives the phone sizes. It needs
// !important, because an inline style wins over a rule in a <style> block.
const PHONE_STYLE = `@media (max-width: 480px) {
  .outer { padding: 0 !important; }
  .bar { padding: 14px 24px !important; font-size: 16px !important; }
  .body { padding: 22px 24px 24px !important; }
  .foot { padding: 16px 24px !important; font-size: 12px !important; }
  .h1 { font-size: 30px !important; }
  .h2 { font-size: 19px !important; }
  .text { font-size: 14px !important; }
  .small { font-size: 12.5px !important; }
  .kv { font-size: 13.5px !important; }
  .note { font-size: 13px !important; }
  .gap { height: 18px !important; }
  table.btn { width: 100% !important; }
  a.btn { display: block !important; padding: 12px 16px !important; font-size: 14px !important; }
}`

// A table with no spacing and no border. The layout uses tables, because Outlook does not
// support the CSS box model for <div> elements.
const TABLE = 'role="presentation" cellpadding="0" cellspacing="0" border="0"'

// Returns the customer footer sentence. A contact part with no value is dropped, so the sentence
// never has an empty part or a comma with nothing after it.
function customerFooter(locale: EmailLocale, store: EmailStore): string {
  const email = store.contact_email?.trim()
  const whatsapp = store.whatsapp?.trim()
  const phone = store.phone?.trim()
  const extras: string[] = []
  if (email) {
    extras.push(t(locale, "common.footerWrite", { email }))
  }
  if (whatsapp) {
    extras.push(t(locale, "common.footerWhatsapp", { whatsapp }))
  }
  if (phone) {
    extras.push(t(locale, "common.footerPhone", { phone }))
  }
  const questions = t(locale, "common.footerQuestions")
  const last = extras.pop()
  if (!last) {
    return `${questions}.`
  }
  return `${[questions, ...extras].join(", ")}, ${t(locale, "common.or")} ${last}.`
}

// Returns the full HTML document of option E around the body HTML.
export function renderShell(input: ShellInput): string {
  const { locale, store, audience } = input
  const footer =
    audience === "owner"
      ? t("en-US", "common.ownerFooter", { store: store.name })
      : customerFooter(locale, store)
  const links = FONT_LINKS.map((href) => `<link href="${escapeHtml(href)}" rel="stylesheet">`).join(
    "\n"
  )

  return `<!doctype html>
<html lang="${langOf(locale)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="x-apple-disable-message-reformatting">
<title>${escapeHtml(input.title)}</title>
${links}
<style>
${PHONE_STYLE}
</style>
</head>
<body style="margin:0;padding:0;background-color:${BACKDROP};">
<div style="display:none;max-height:0;max-width:0;overflow:hidden;opacity:0;mso-hide:all;font-size:1px;line-height:1px;color:${BACKDROP};">${escapeHtml(input.preheader)}</div>
<table ${TABLE} width="100%" bgcolor="${BACKDROP}" style="width:100%;background-color:${BACKDROP};">
<tr><td class="outer" align="center" style="padding:24px 0;">
<table ${TABLE} width="600" style="width:100%;max-width:600px;margin:0 auto;">
<tr><td class="bar" align="center" bgcolor="${BAR}" style="background-color:${BAR};padding:16px 32px;font-family:${SERIF};font-size:18px;font-weight:500;line-height:1.2;letter-spacing:.24em;text-transform:uppercase;color:${BAR_TEXT};text-align:center;"><span style="padding-left:.24em;color:${BAR_TEXT};">${escapeHtml(store.name)}</span></td></tr>
<tr><td class="body" bgcolor="${PAPER}" style="background-color:${PAPER};padding:28px 40px 32px;font-family:${SANS};font-size:15px;line-height:1.5;color:${INK};text-align:left;">
${input.body}
</td></tr>
<tr><td class="foot" align="center" bgcolor="${PAPER}" style="background-color:${PAPER};border-top:1px solid ${HAIRLINE};padding:18px 40px 22px;font-family:${SANS};font-size:12.5px;line-height:1.6;color:${MUTED};text-align:center;">${escapeHtml(footer)}<br>${escapeHtml(store.name)}</td></tr>
</table>
</td></tr>
</table>
</body>
</html>`
}

// Returns the small uppercase line above the heading, for example the order number and the date.
export function eyebrow(text: string): string {
  return `<p style="margin:0;font-family:${SANS};font-size:11px;line-height:1.5;letter-spacing:.14em;text-transform:uppercase;color:${MUTED};">${escapeHtml(text)}</p>`
}

// Returns the serif <h1> of the email.
export function heading(text: string): string {
  return `<h1 class="h1" style="margin:6px 0 10px;font-family:${SERIF};font-size:34px;font-weight:500;line-height:1.1;color:${INK};">${escapeHtml(text)}</h1>`
}

// Returns a hairline rule and the serif <h2> that starts a part of the email.
export function part(title: string): string {
  const gap = `<tr><td class="gap" height="22" style="height:22px;font-size:0;line-height:0;">&nbsp;</td></tr>`
  return `<table ${TABLE} width="100%" style="width:100%;border-collapse:collapse;">
${gap}
<tr><td style="height:1px;font-size:0;line-height:0;border-top:1px solid ${HAIRLINE};">&nbsp;</td></tr>
${gap}
</table>
<h2 class="h2" style="margin:0 0 10px;font-family:${SERIF};font-size:21px;font-weight:600;line-height:1.2;color:${INK};">${escapeHtml(title)}</h2>`
}

// Returns a paragraph. A muted paragraph has the smaller size and the muted colour.
export function paragraph(text: string, muted = false): string {
  return paragraphHtml(escapeHtml(text), muted)
}

// Returns a paragraph around HTML, for example a text link. The function does not escape the
// HTML, so the caller must escape each value in it.
export function paragraphHtml(html: string, muted = false): string {
  const style = muted ? `font-size:13px;color:${MUTED};` : `font-size:15px;color:${INK};`
  return `<p class="${muted ? "small" : "text"}" style="margin:0 0 10px;font-family:${SANS};line-height:1.5;${style}">${html}</p>`
}

// Returns a bullet list in the body font and colour. The function escapes each item.
export function list(items: string[]): string {
  const rows = items
    .map(
      (item) =>
        `<li class="text" style="margin:0 0 4px;font-family:${SANS};font-size:15px;line-height:1.5;color:${INK};">${escapeHtml(item)}</li>`
    )
    .join("\n")
  return `<ul style="margin:0 0 12px;padding:0 0 0 20px;font-family:${SANS};color:${INK};">
${rows}
</ul>`
}

// Returns the boxed key-value table for the key facts, for example the bank account.
export function keyValues(rows: { label: string; value: string; strong?: boolean }[]): string {
  const cell = `font-family:${SANS};font-size:14.5px;line-height:1.4;vertical-align:top;`
  const lines = rows
    .map((row) => {
      const value = escapeHtml(row.value)
      return `<tr><td class="kv" width="32%" style="${cell}width:32%;padding:6px 12px 6px 0;color:${MUTED};">${escapeHtml(row.label)}</td><td class="kv" style="${cell}padding:6px 0;color:${INK};word-break:break-word;">${row.strong ? `<strong>${value}</strong>` : value}</td></tr>`
    })
    .join("\n")
  return `<table ${TABLE} width="100%" bgcolor="${BOX}" style="width:100%;margin:12px 0;border-collapse:separate;background-color:${BOX};border:1px solid ${HAIRLINE};">
<tr><td style="padding:10px 16px;">
<table ${TABLE} width="100%" style="width:100%;border-collapse:collapse;">
${lines}
</table>
</td></tr>
</table>`
}

// Returns the block for a deadline or a warning.
export function callout(text: string): string {
  return `<table ${TABLE} width="100%" bgcolor="${CALLOUT}" style="width:100%;margin:12px 0 16px;border-collapse:collapse;background-color:${CALLOUT};">
<tr><td class="note" style="padding:12px 16px;font-family:${SANS};font-size:14px;line-height:1.5;color:${CALLOUT_TEXT};">${escapeHtml(text)}</td></tr>
</table>`
}

// Returns the block for a note from the owner. The note is escaped first, so the <br> elements
// are the only HTML in it.
export function quote(text: string): string {
  const lines = escapeHtml(text).replace(/\r?\n/g, "<br>")
  return `<table ${TABLE} width="100%" bgcolor="${BOX}" style="width:100%;margin:12px 0 14px;border-collapse:collapse;background-color:${BOX};">
<tr><td class="text" style="padding:10px 16px;border-left:3px solid ${BAR};font-family:${SANS};font-size:15px;line-height:1.5;color:${INK};">${lines}</td></tr>
</table>`
}

// Returns the primary button. The class "btn" lets the media query make it full width on a
// phone. The table cell carries the colour for the clients that ignore the padding of a link.
export function button(href: string, label: string): string {
  return `<table ${TABLE} class="btn" style="margin:4px 0 8px;border-collapse:separate;">
<tr><td align="center" bgcolor="${BAR}" style="background-color:${BAR};">
<a class="btn" href="${escapeHtml(href)}" style="display:inline-block;box-sizing:border-box;padding:13px 28px;font-family:${SANS};font-size:15px;font-weight:500;line-height:1.2;color:${BAR_TEXT};text-decoration:none;text-align:center;">${escapeHtml(label)}</a>
</td></tr>
</table>`
}

// Returns an inline text link. Only the primary action uses a button.
export function textLink(href: string, label: string): string {
  return `<a href="${escapeHtml(href)}" style="color:${INK};text-decoration:underline;">${escapeHtml(label)}</a>`
}

// Returns the trimmed text, or an empty string for a value that is not a string.
function clean(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim() : ""
}

// Returns true for a finite number. A price can be absent, for example in an email that shows
// the items with no amounts.
function isAmount(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value)
}

// Returns the order table: one row per item, then the shipping row and the total row when they
// are given. The amount column is there only when the table has an amount.
export function orderLines(input: {
  locale: EmailLocale
  items: EmailLineItem[]
  shipping?: { method: string | null; amount: number } | null
  total?: number | null
}): string {
  const { locale, items, shipping, total } = input
  const hasAmounts =
    items.some((item) => isAmount(item.unit_price)) || !!shipping || isAmount(total)
  const cell = `padding:8px 0;vertical-align:top;font-family:${SANS};font-size:15px;line-height:1.5;`
  const amountCell = `${cell}padding-left:16px;text-align:right;white-space:nowrap;font-variant-numeric:tabular-nums;`

  const row = (label: string, amount: string | null, extra: string): string => {
    const amountHtml = hasAmounts
      ? `<td class="text" align="right" style="${amountCell}${extra}">${amount ?? ""}</td>`
      : ""
    return `<tr><td class="text" style="${cell}${extra}">${label}</td>${amountHtml}</tr>`
  }

  const lines = items.map((item) => {
    const variant = clean(item.variant_title)
    const label = `${escapeHtml(item.quantity)} × ${escapeHtml(item.title)}${
      variant ? ` <span style="color:${MUTED};">${escapeHtml(variant)}</span>` : ""
    }`
    const amount = isAmount(item.unit_price)
      ? escapeHtml(formatRupiah(item.unit_price * item.quantity))
      : null
    return row(label, amount, `color:${INK};`)
  })

  if (shipping) {
    const method = clean(shipping.method)
    const label = method
      ? `${t(locale, "common.shipping")} · ${method}`
      : t(locale, "common.shipping")
    lines.push(row(escapeHtml(label), escapeHtml(formatRupiah(shipping.amount)), `color:${MUTED};`))
  }

  if (isAmount(total)) {
    lines.push(
      row(
        escapeHtml(t(locale, "common.total")),
        escapeHtml(formatRupiah(total)),
        `color:${INK};font-weight:600;padding-top:10px;border-top:1px solid ${HAIRLINE};`
      )
    )
  }

  return `<table ${TABLE} width="100%" style="width:100%;border-collapse:collapse;">
${lines.join("\n")}
</table>`
}

// Returns true only for an https URL. Any other scheme, for example "javascript:" or "http:",
// never goes into an href or an src attribute.
export function isHttpsUrl(value: string | null | undefined): value is string {
  if (typeof value !== "string") {
    return false
  }
  try {
    return new URL(value).protocol === "https:"
  } catch {
    return false
  }
}

// Returns the product list with a 56 x 70 px thumbnail, the title, the variant, and the price.
// An item with no safe thumbnail gets an empty cell of the same size.
export function productRows(items: EmailProductRow[]): string {
  const rows = items.map((item) => {
    const thumb = isHttpsUrl(item.thumbnail)
      ? `<img src="${escapeHtml(item.thumbnail)}" width="56" height="70" alt="" style="display:block;width:56px;height:70px;object-fit:cover;border:0;background-color:${THUMB};">`
      : `<table ${TABLE} width="56" style="width:56px;border-collapse:collapse;"><tr><td width="56" height="70" bgcolor="${THUMB}" style="width:56px;height:70px;background-color:${THUMB};font-size:0;line-height:0;">&nbsp;</td></tr></table>`
    const variant = clean(item.variant_title)
    const price = clean(item.price)
    const oldPrice = clean(item.old_price)
    const priceLine = price
      ? `<br><span class="small" style="font-size:13px;color:${MUTED};">${
          oldPrice ? `<s>${escapeHtml(oldPrice)}</s> ` : ""
        }<span style="color:${INK};">${escapeHtml(price)}</span></span>`
      : ""
    const variantLine = variant
      ? `<br><span class="small" style="font-size:13px;color:${MUTED};">${escapeHtml(variant)}</span>`
      : ""
    return `<tr><td width="56" style="width:56px;padding:6px 12px 6px 0;vertical-align:middle;">${thumb}</td><td class="text" style="padding:6px 0;vertical-align:middle;font-family:${SANS};font-size:15px;line-height:1.4;color:${INK};"><span style="font-weight:500;">${escapeHtml(item.title)}</span>${variantLine}${priceLine}</td></tr>`
  })
  return `<table ${TABLE} width="100%" style="width:100%;margin:12px 0 16px;border-collapse:collapse;">
${rows.join("\n")}
</table>`
}

// Returns the "Ship to" part with the address lines that have a value. An address with no line
// gives an empty string, so the email has no empty part.
export function address(locale: EmailLocale, value: EmailAddress): string {
  const name = [clean(value.first_name), clean(value.last_name)].filter(Boolean).join(" ")
  const place = [clean(value.city), clean(value.postal_code)].filter(Boolean).join(" ")
  const lines = [name, clean(value.address_1), place, clean(value.phone)].filter(Boolean)
  if (lines.length === 0) {
    return ""
  }
  return `${part(t(locale, "common.shipTo"))}
<p class="text" style="margin:0 0 10px;font-family:${SANS};font-size:15px;line-height:1.5;color:${INK};">${lines.map(escapeHtml).join("<br>")}</p>`
}
