import { emailButton, escapeHtml, formatWibTime, greeting, layout, RenderedEmail } from "./html"

export type MagicLinkEmailData = {
  store_name: string
  first_name?: string | null
  sign_in_url: string
  browser: string
  // ISO time of the request.
  requested_at: string
}

// Returns the email with the one-time sign-in link. The email contains only the link with the
// request id and the token, never the secret of the browser.
export function renderMagicLink(data: MagicLinkEmailData): RenderedEmail {
  if (!data?.sign_in_url) {
    throw new Error('The "magic-link" template needs a sign_in_url.')
  }
  if (!data.store_name) {
    throw new Error('The "magic-link" template needs a store_name.')
  }

  const title = `Sign in to ${data.store_name}`

  const body = [
    `<p>${greeting(data.first_name)}</p>`,
    `<p>Click the button to sign in to ${escapeHtml(data.store_name)}.</p>`,
    emailButton(data.sign_in_url, "Sign in"),
    "<p>The link works one time. It expires in 15 minutes.</p>",
    `<p>Request: ${escapeHtml(data.browser)}, ${escapeHtml(formatWibTime(new Date(data.requested_at)))}.</p>`,
    "<p>If you did not ask to sign in, ignore this email. Nobody can sign in without this link.</p>",
  ].join("\n")

  return { subject: title, html: layout(title, body) }
}
