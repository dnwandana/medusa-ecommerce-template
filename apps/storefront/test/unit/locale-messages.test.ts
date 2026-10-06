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

  it.each([
    ["nav.menu", "Menu", "Menu"],
    [
      "footer.about",
      "Everyday is a clothing label for ordinary days: easy shapes, calm colours, fair prices.",
      "Everyday adalah label pakaian untuk hari-hari biasa: potongan nyaman, warna tenang, harga wajar.",
    ],
    ["footer.shop", "Shop", "Belanja"],
    ["common.securePayment", "Secure payment with Mayar.", "Pembayaran aman dengan Mayar."],
    [
      "common.shipsIndonesia",
      "We ship to all of Indonesia.",
      "Kami mengirim ke seluruh Indonesia.",
    ],
    ["products.viewCart", "View cart", "Lihat keranjang"],
    ["cart.summary", "Summary", "Ringkasan"],
    ["cart.emptyBody", "Find a piece for your everyday.", "Temukan pakaian untuk keseharian Anda."],
    ["checkout.steps.address", "Address", "Alamat"],
    ["checkout.steps.shipping", "Shipping", "Pengiriman"],
    ["checkout.steps.payment", "Payment", "Pembayaran"],
    ["checkout.summary", "Order summary", "Ringkasan pesanan"],
    [
      "checkout.shippingHint",
      "Save the address to see the shipping options.",
      "Simpan alamat untuk melihat opsi pengiriman.",
    ],
    ["reviews.writeFor", "Write a review: {product}", "Tulis ulasan: {product}"],
    ["auth.newHere", "New here?", "Baru di sini?"],
    ["auth.haveAccountShort", "Have an account?", "Sudah punya akun?"],
    ["auth.showPassword", "Show the password", "Tampilkan kata sandi"],
    ["auth.hidePassword", "Hide the password", "Sembunyikan kata sandi"],
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
