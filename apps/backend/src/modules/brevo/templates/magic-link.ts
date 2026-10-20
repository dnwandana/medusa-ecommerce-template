import { formatWibTime, RenderedEmail } from "./html"
import { type EmailLocale, t } from "./i18n"
import { button, type EmailStore, heading, keyValues, paragraph, renderShell } from "./shell"

export type MagicLinkEmailData = {
  locale: EmailLocale
  store: EmailStore
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

  const { locale, store } = data
  const subject = t(locale, "magicLink.subject", { store: store.name })
  const name = data.first_name?.trim()
  const intro = name
    ? t(locale, "magicLink.intro", { name, store: store.name })
    : t(locale, "magicLink.introNoName", { store: store.name })

  const body = [
    heading(t(locale, "magicLink.heading")),
    paragraph(intro),
    button(data.sign_in_url, t(locale, "magicLink.button")),
    // The request facts let the customer see a sign-in that they did not ask for.
    keyValues([
      { label: t(locale, "magicLink.request"), value: data.browser },
      {
        label: t(locale, "magicLink.time"),
        value: formatWibTime(new Date(data.requested_at), locale),
      },
    ]),
    paragraph(t(locale, "magicLink.ignore"), true),
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
