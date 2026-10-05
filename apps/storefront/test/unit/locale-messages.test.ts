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
})
