export type RenderedEmail = { subject: string; html: string }

// Makes a value safe for HTML text and for an attribute in double quotation marks.
export function escapeHtml(value: unknown): string {
  if (value === null || value === undefined) {
    return ""
  }
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

// Formats whole rupiah, for example "Rp 150.000". It does not use Intl, so the result
// is the same on all Node builds.
export function formatRupiah(amount: unknown): string {
  const number = Number(amount)
  const whole = Number.isFinite(number) ? Math.round(number) : 0
  return `Rp ${String(whole).replace(/\B(?=(\d{3})+(?!\d))/g, ".")}`
}

const WIB_FORMAT = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Jakarta",
  day: "numeric",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
})

// Formats a time in WIB (Asia/Jakarta), for example "18 October 2026, 14:30 WIB". It builds the
// text from the parts, because the words that join the parts differ between ICU versions.
export function formatWibTime(date: Date): string {
  const parts: Record<string, string> = {}
  for (const part of WIB_FORMAT.formatToParts(date)) {
    parts[part.type] = part.value
  }
  return `${parts.day} ${parts.month} ${parts.year}, ${parts.hour}:${parts.minute} WIB`
}

// Returns a full HTML document with the title in an <h1> element.
export function layout(title: string, bodyHtml: string): string {
  const safeTitle = escapeHtml(title)
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${safeTitle}</title>
</head>
<body style="margin:0;padding:24px;background:#f6f6f6;font-family:Arial,Helvetica,sans-serif;color:#222;">
<div style="max-width:560px;margin:0 auto;padding:24px;background:#ffffff;border-radius:8px;">
<h1>${safeTitle}</h1>
${bodyHtml}
</div>
</body>
</html>`
}

// Returns a dark link button in a paragraph. It escapes the link and the label.
export function emailButton(href: string, label: string): string {
  return `<p><a href="${escapeHtml(href)}" style="display:inline-block;padding:12px 24px;background:#1d1b18;color:#ffffff;text-decoration:none;font-weight:bold;">${escapeHtml(label)}</a></p>`
}

// Returns the escaped greeting line text. A first name that is empty after trim gives
// "Hi there,".
export function greeting(firstName: string | null | undefined): string {
  const name = typeof firstName === "string" ? firstName.trim() : ""
  return name ? `Hi ${escapeHtml(name)},` : "Hi there,"
}
