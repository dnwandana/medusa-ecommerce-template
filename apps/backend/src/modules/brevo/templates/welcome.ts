import { RenderedEmail } from "./html"
import { type EmailLocale, t } from "./i18n"
import { button, type EmailStore, heading, list, paragraph, renderShell } from "./shell"

export type WelcomeEmailData = {
  locale: EmailLocale
  store: EmailStore
  first_name?: string | null
  shop_url: string
}

const ITEM_KEYS = ["welcome.item1", "welcome.item2", "welcome.item3", "welcome.item4"] as const

// Returns the email for a new customer account.
export function renderWelcome(data: WelcomeEmailData): RenderedEmail {
  if (!data?.shop_url) {
    throw new Error('The "welcome" template needs a shop_url.')
  }

  const { locale, store } = data
  const subject = t(locale, "welcome.subject", { store: store.name })
  const name = data.first_name?.trim()
  const intro = t(locale, "welcome.intro")

  const body = [
    heading(name ? t(locale, "welcome.heading", { name }) : t(locale, "welcome.headingNoName")),
    paragraph(intro),
    // The things that a customer can do with the account.
    list(ITEM_KEYS.map((key) => t(locale, key))),
    paragraph(t(locale, "welcome.signIn")),
    button(data.shop_url, t(locale, "welcome.button")),
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
