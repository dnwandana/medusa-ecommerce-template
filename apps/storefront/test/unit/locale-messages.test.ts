import { readdirSync, readFileSync, statSync } from "node:fs"
import { extname, join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"
import en from "../../i18n/locales/en.json"
import id from "../../i18n/locales/id.json"

type Messages = { [key: string]: string | Messages }

// Returns each message with its full key, for example "cart.title".
const flatten = (messages: Messages, prefix = ""): Record<string, string> =>
  Object.entries(messages).reduce<Record<string, string>>((result, [key, value]) => {
    const path = prefix ? `${prefix}.${key}` : key
    return typeof value === "string"
      ? { ...result, [path]: value }
      : { ...result, ...flatten(value, path) }
  }, {})

const placeholders = (text: string) => (text.match(/\{[a-z]+\}/g) ?? []).sort()

const english = flatten(en)
const indonesian = flatten(id)

const root = fileURLToPath(new URL("../../", import.meta.url))

// Returns all files below the directory that have one of the extensions.
function listFiles(dir: string, extensions: string[]): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) {
      return listFiles(path, extensions)
    }
    return extensions.includes(extname(path)) ? [path] : []
  })
}

const removedKeys = [
  "auth.loginTitle",
  "auth.registerTitle",
  "auth.password",
  "auth.passwordHint",
  "auth.firstName",
  "auth.lastName",
  "auth.loginAction",
  "auth.registerAction",
  "auth.noAccount",
  "auth.haveAccount",
  "auth.forgotLink",
  "auth.loginFailed",
  "auth.registerFailed",
  "auth.forgotTitle",
  "auth.forgotIntro",
  "auth.forgotAction",
  "auth.forgotSent",
  "auth.resetTitle",
  "auth.newPassword",
  "auth.resetAction",
  "auth.resetDone",
  "auth.resetFailed",
  "auth.resetIncomplete",
  "auth.newHere",
  "auth.haveAccountShort",
  "auth.showPassword",
  "auth.hidePassword",
  "nav.login",
  "account.logout",
]

describe("locale messages", () => {
  // Review Focus: a key that is absent in id.json shows as a raw key on the /id/ pages.
  it("has the same keys in English and in Indonesian", () => {
    expect(Object.keys(indonesian).sort()).toEqual(Object.keys(english).sort())
  })

  it("has no empty message", () => {
    for (const [key, value] of [...Object.entries(english), ...Object.entries(indonesian)]) {
      expect(value.trim(), key).not.toBe("")
    }
  })

  it("uses the same placeholders in the two languages", () => {
    for (const key of Object.keys(english)) {
      expect(placeholders(indonesian[key] ?? ""), key).toEqual(placeholders(english[key]))
    }
  })

  it("has the texts of the return page that the spec gives", () => {
    expect(english["return.pendingTitle"]).toBe("Payment is being confirmed")
    expect(english["return.failedBody"]).toContain("we received your payment and will contact you")
  })

  it("has the texts of the saved addresses that the spec gives", () => {
    expect(english["account.addresses.title"]).toBe("Addresses")
    expect(english["checkout.addressSaved"]).toBe(
      'The address is saved to your account as "{label}".'
    )
    expect(english["checkout.addressNotSaved"]).toBe(
      "The address was not saved to your account. Your order still ships to this address."
    )
    expect(english["account.addresses.onlyAddress"]).toBe(
      "This is your only address. After you delete it, you have no saved addresses."
    )
  })

  it("has the payment texts that the spec gives and no gateway name", () => {
    expect(english["checkout.paymentProviders.default"]).toBe("Online payment")
    expect(english["checkout.paymentHints.pp_bank-transfer_bank-transfer"]).toBe(
      "You get the bank details after you place the order. Upload the receipt within 24 hours."
    )
    expect(english["checkout.placeOrder"]).toBe("Place order")
    expect(indonesian["checkout.placeOrder"]).toBe("Buat pesanan")
    expect(english["checkout.mayarHint"]).toBeUndefined()
    expect(english["checkout.pay"]).toBeUndefined()
    for (const value of [...Object.values(english), ...Object.values(indonesian)]) {
      expect(value).not.toMatch(/mayar/i)
    }
  })

  it("has no country text, because the store ships only in Indonesia", () => {
    expect(english["checkout.country"]).toBeUndefined()
    expect(indonesian["checkout.country"]).toBeUndefined()
  })

  it("has the texts of the error page and the shared parts that the spec gives", () => {
    expect(english["error.notFound.title"]).toBe("This page is not here")
    expect(english["error.server.body"]).toBe(
      "An error occurred on our side. Try again in a few minutes."
    )
    expect(english["common.free"]).toBe("Free")
    expect(indonesian["common.free"]).toBe("Gratis")
    expect(english["common.delivery"]).toBe("Delivery")
    expect(english["common.decrease"]).toBe("Decrease the quantity")
    expect(english["common.increase"]).toBe("Increase the quantity")
    expect(english["common.rating"]).toBe("{rating} out of 5 stars")
  })

  it("has the texts of the shell that the spec gives", () => {
    expect(english["shell.announcement"]).toBe("Delivered to your door, across Indonesia")
    expect(english["nav.signIn"]).toBe("Sign in")
    expect(indonesian["nav.signIn"]).toBe("Masuk")
    expect(english["nav.signOut"]).toBe("Sign out")
    expect(indonesian["nav.signOut"]).toBe("Keluar")
    expect(english["footer.returns"]).toBe("Returns and exchanges")
    expect(english["footer.track"]).toBe("Track an order")
    expect(english["footer.copyright"]).toBe("© {year} {brand}")
    expect(english["checkoutLayout.back"]).toBe("Back to cart")
    expect(english["checkoutLayout.secure"]).toBe("Secure checkout")
    for (const name of ["delivery", "returns", "about", "privacy", "terms"]) {
      expect(english[`pages.${name}.title`], name).toBeTruthy()
      expect(english[`pages.${name}.sections.0.heading`], name).toBeTruthy()
    }
    expect(english["pages.about.title"]).toBe("Our story")
  })

  it("has the catalog texts that the spec gives", () => {
    expect(english["products.badges.limited"]).toBe("Limited stock")
    expect(english["products.badges.soldOut"]).toBe("Sold out")
    expect(english["home.newProducts"]).toBe("New in")
    expect(english["home.service.0.title"]).toBe("Delivered to your door")
    expect(english["home.service.0.body"]).toBe(
      "Sent by trusted couriers to any address in Indonesia."
    )
    expect(english["home.service.2.body"]).toBe(
      "Our stylists reply within a day, in English or Bahasa Indonesia."
    )
    expect(english["listing.noMatchTitle"]).toBe("No pieces match these filters")
    expect(english["listing.end"]).toBe("You have seen all {count} pieces")
    expect(english["listing.sort.priceAsc"]).toBe("Price, low to high")
    expect(english["listing.priceUnder"]).toBe("Under {price}")
    expect(indonesian["listing.priceUnder"]).toBe("Di bawah {price}")
    expect(english["search.seeAll"]).toBe("See all results")
    expect(english["product.details"]).toBe("Details and fit")
    expect(english["product.care"]).toBe("Fabric and care")
    expect(english["reviews.showMore"]).toBe("Show more reviews")
  })

  it("has the cart texts that the spec gives", () => {
    expect(english["cart.title"]).toBe("Your cart")
    expect(english["cart.pieces"]).toBe("{count} pieces | {count} piece | {count} pieces")
    expect(english["cart.empty"]).toBe("Your cart is empty")
    expect(english["cart.emptyBodyWishlist"]).toBe(
      "Pieces you add will wait here. Your wishlist keeps anything you saved."
    )
    expect(english["cart.discover"]).toBe("Discover the collection")
    expect(english["cart.summary"]).toBe("Order summary")
    expect(english["cart.checkout"]).toBe("Checkout")
    expect(english["cart.paymentNote"]).toBe("Choose your payment method at checkout.")
    expect(indonesian["cart.paymentNote"]).toBe("Pilih metode pembayaran saat checkout.")
    expect(english["cart.removeItem"]).toBe("Remove {product}")
    expect(english["cart.removing"]).toBe("Removing…")
    expect(english["cart.moveItem"]).toBe("Move {product} to the wishlist")
    expect(english["cart.movedToWishlist"]).toBe("The product is in your wishlist.")
    expect(english["cart.viewWishlist"]).toBe("View wishlist")
  })

  it("has the checkout texts that the spec gives", () => {
    expect(english["checkout.address"]).toBe("Delivery address")
    expect(english["checkout.city"]).toBe("City or regency")
    expect(indonesian["checkout.city"]).toBe("Kota/Kabupaten")
    expect(english["checkout.shippingOption"]).toBe("Delivery method")
    expect(english["checkout.guestLogin"]).toBe("Sign in")
    expect(english["checkout.emailHint"]).toBe(
      "We send the order confirmation and the order status to this address."
    )
    expect(english["checkout.fullName"]).toBe("Full name")
    expect(english["checkout.provincePlaceholder"]).toBe("Select a province")
    expect(english["checkout.errors.province"]).toBe("Select a province.")
    expect(english["checkout.paymentCaptions.manual"]).toBe(
      "Manual transfer, confirmed by the store"
    )
    expect(english["checkout.paymentCaptions.gateway"]).toBe(
      "Card, QRIS, virtual account or e-wallet"
    )
    expect(english["checkout.gatewayHint"]).toBe(
      "You pay on the secure page of our payment partner. You can choose a card, QRIS, a virtual account or an e-wallet there."
    )
    expect(english["checkout.paymentLocked"]).toBe(
      "Select a delivery method to see the payment methods."
    )
    expect(english["checkout.placing"]).toBe("Placing the order…")
    expect(english["checkout.placeOrderTotal"]).toBe("Place order · {total}")
    expect(english["checkout.showSummary"]).toBe("Show order summary")
    expect(english["checkout.editCart"]).toBe("Edit cart")
  })

  it("has the sign-in and account texts that the spec gives", () => {
    expect(english["auth.signIn.title"]).toBe("Sign in")
    expect(indonesian["auth.signIn.title"]).toBe("Masuk")
    expect(english["auth.signIn.intro"]).toBe(
      "Type your email address. We send you a link to sign in. You do not need a password."
    )
    expect(english["auth.signIn.newAccount"]).toBe(
      "No account yet? The same link creates your account."
    )
    expect(english["auth.signIn.invalidEmail"]).toBe("Type a valid email address.")
    expect(english["auth.signIn.failed"]).toBe("We could not send the link. Try again.")
    expect(english["auth.check.sentTo"]).toBe(
      "We sent a link to {email}. Open the link to sign in. The link expires in 15 minutes."
    )
    expect(english["auth.check.resendIn"]).toBe("Send the link again in {time}")
    expect(english["auth.check.spam"]).toBe("No email? Look in your spam folder.")
    expect(english["auth.check.expiredTitle"]).toBe("The link expired.")
    expect(english["auth.verify.closesSoon"]).toBe("This tab closes in 5 seconds.")
    expect(english["auth.verify.confirmTitle"]).toBe("Sign in on your other device?")
    expect(english["auth.verify.confirm"]).toBe("Yes, sign me in")
    expect(english["auth.verify.confirmNote"]).toBe(
      "If you did not ask for this link, close this tab. Nobody signs in without this button."
    )
    expect(english["auth.verify.signInAgain"]).toBe("Sign in again")
    expect(english["auth.welcome.title"]).toBe("Welcome to {store}")
    expect(indonesian["auth.welcome.title"]).toBe("Selamat datang di {store}")
    expect(english["auth.welcome.intro"]).toBe("Your account is ready. What should we call you?")
    expect(indonesian["auth.welcome.intro"]).toBe("Akun Anda sudah siap. Siapa nama Anda?")
    expect(indonesian["auth.welcome.fullName"]).toBe("Nama lengkap")
    expect(indonesian["auth.welcome.skip"]).toBe("Lewati")
    expect(english["auth.welcome.nameRequired"]).toBe("Type your full name, or click Skip.")
    expect(english["account.greeting"]).toBe("Welcome, {name}.")
    expect(english["account.greetingNoName"]).toBe("Welcome.")
  })

  it("has the order page texts that the spec gives", () => {
    expect(english["order.eyebrow"]).toBe("Order #{id} · {date}")
    expect(indonesian["order.eyebrow"]).toBe("Pesanan #{id} · {date}")
    expect(english["order.heading.placed"]).toBe("Thank you, {name}. Your order is placed.")
    expect(english["order.heading.shipped"]).toBe("Your order is on its way.")
    expect(indonesian["order.heading.shipped"]).toBe("Pesanan Anda sedang dikirim.")
    expect(english["order.body.processing"]).toBe(
      "We sent a confirmation to {email}. We will write again when your parcel leaves the atelier."
    )
    expect(english["order.tracker.confirmed"]).toBe("Confirmed")
    expect(english["order.tracker.onItsWay"]).toBe("On its way")
    expect(english["order.tracker.delivered"]).toBe("Delivered")
    expect(english["order.tracker.waitingForPayment"]).toBe("Waiting for payment")
    expect(english["order.tracker.checkingReceipt"]).toBe("Checking your receipt")
    expect(english["order.tracker.partlyShipped"]).toBe("Part of your order has shipped.")
    expect(indonesian["order.tracker.partlyShipped"]).toBe("Sebagian pesanan Anda sudah dikirim.")
    expect(english["order.cancelledTimeout"]).toBe(
      "We cancelled this order because we did not get your payment within 24 hours."
    )
    expect(english["order.cancelledByStore"]).toBe(
      "The store cancelled this order. Contact us if you have questions."
    )
    expect(english["order.refundedAmount"]).toBe("We refunded {amount} to you.")
    expect(english["order.shipment.track"]).toBe("Track your parcel")
    expect(indonesian["order.shipment.track"]).toBe("Lacak paket Anda")
    expect(indonesian["order.shipment.trackingNumber"]).toBe("Nomor resi")
    expect(english["order.free"]).toBe("Free")
    expect(indonesian["order.free"]).toBe("Gratis")
  })

  it.each(["checkout.firstName", "checkout.lastName", "checkout.steps.address"])(
    "has no obsolete checkout key %s",
    (key) => {
      expect(english[key]).toBeUndefined()
      expect(indonesian[key]).toBeUndefined()
    }
  )

  it.each([
    "order.heading.placedNoName",
    "order.heading.confirmed",
    "order.heading.confirmedNoName",
    "order.heading.delivered",
    "order.heading.cancelled",
    "order.heading.refunded",
    "order.body.waiting",
    "order.body.checking",
    "order.body.shipped",
    "order.body.delivered",
    "order.tracker.label",
    "order.tracker.done",
    "order.tracker.current",
    "order.tracker.upcoming",
    "order.contactUs",
    "order.or",
    "order.shipment.title",
    "order.shipment.shippedOn",
    "order.shipment.shippedOnNoOption",
    "order.shipment.newTab",
    "order.details.deliveringTo",
    "order.details.delivery",
    "order.details.payment",
    "order.paymentState.awaiting",
    "order.paymentState.received",
    "order.paymentState.notReceived",
    "order.paymentState.cancelled",
    "order.refunded",
    "order.itemsTitle",
    "order.quantity",
    "order.totalPaid",
    "order.questions",
    "order.contactLine",
    "order.contactLink",
  ])("has the order key %s in both languages", (key) => {
    expect(english[key]).toEqual(expect.any(String))
    expect(indonesian[key]).toEqual(expect.any(String))
  })

  it.each(removedKeys)("has no password key %s", (key) => {
    expect(english[key]).toBeUndefined()
    expect(indonesian[key]).toBeUndefined()
  })

  it("has each key that a source file reads", () => {
    const read = listFiles(join(root, "app"), [".vue", ".ts"]).flatMap((file) =>
      [...readFileSync(file, "utf8").matchAll(/\bt\(\s*["']([a-zA-Z0-9_.]+)["']/g)].map(
        (match) => match[1]
      )
    )
    expect(read.filter((key) => english[key] === undefined)).toEqual([])
  })

  it.each([
    ["nav.menu", "Menu", "Menu"],
    [
      "footer.about",
      "Everyday is a clothing label for ordinary days: easy shapes, calm colours, fair prices.",
      "Everyday adalah label pakaian untuk hari-hari biasa: potongan nyaman, warna tenang, harga wajar.",
    ],
    ["footer.shop", "Shop", "Belanja"],
    ["common.securePayment", "Secure payment.", "Pembayaran aman."],
    [
      "common.shipsIndonesia",
      "We ship to all of Indonesia.",
      "Kami mengirim ke seluruh Indonesia.",
    ],
    ["products.viewCart", "View cart", "Lihat keranjang"],
    ["cart.summary", "Order summary", "Ringkasan pesanan"],
    [
      "cart.emptyBody",
      "Pieces you add will wait here.",
      "Pakaian yang Anda tambahkan menunggu di sini.",
    ],
    ["checkout.summary", "Order summary", "Ringkasan pesanan"],
    [
      "checkout.shippingHint",
      "Save the address to see the delivery methods.",
      "Simpan alamat untuk melihat metode pengiriman.",
    ],
    ["reviews.writeFor", "Write a review: {product}", "Tulis ulasan: {product}"],
    [
      "home.title",
      "Clothes for the days you actually have.",
      "Pakaian untuk hari-hari Anda yang sebenarnya.",
    ],
    [
      "home.subtitle",
      "Made for most days. Relaxed shirts, wide-leg chinos and the pieces you reach for without thinking.",
      "Dibuat untuk hampir setiap hari. Kemeja santai, chino lebar, dan pakaian yang selalu Anda pilih.",
    ],
  ])("has the Everyday text for %s", (key, englishText, indonesianText) => {
    expect(english[key]).toBe(englishText)
    expect(indonesian[key]).toBe(indonesianText)
  })
})
