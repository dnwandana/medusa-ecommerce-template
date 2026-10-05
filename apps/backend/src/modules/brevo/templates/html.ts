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
