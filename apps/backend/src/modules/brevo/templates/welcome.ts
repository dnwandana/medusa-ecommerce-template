import { emailButton, greeting, layout, RenderedEmail } from "./html"

export type WelcomeEmailData = {
  store_name: string
  first_name?: string | null
  shop_url: string
}

// Returns the email for a new customer account. The email is in English only.
export function renderWelcome(data: WelcomeEmailData): RenderedEmail {
  if (!data?.shop_url) {
    throw new Error('The "welcome" template needs a shop_url.')
  }
  if (!data.store_name) {
    throw new Error('The "welcome" template needs a store_name.')
  }

  const title = `Welcome to ${data.store_name}`

  const body = [
    `<p>${greeting(data.first_name)}</p>`,
    "<p>Your account is ready. With your account, you can:</p>",
    "<ul>",
    "<li>see your orders and their status,</li>",
    "<li>save your delivery addresses,</li>",
    "<li>keep a wishlist,</li>",
    "<li>review the products that you bought.</li>",
    "</ul>",
    "<p>To sign in, type your email address on our site. We send you a link each time, so you do not need a password.</p>",
    emailButton(data.shop_url, "Start shopping"),
  ].join("\n")

  return { subject: title, html: layout(title, body) }
}
