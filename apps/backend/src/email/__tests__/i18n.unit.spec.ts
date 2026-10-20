import { en } from "../templates/i18n/en"
import { id } from "../templates/i18n/id"
import { langOf, t, toEmailLocale } from "../templates/i18n"

describe("toEmailLocale", () => {
  it.each([
    ["id-ID", "id-ID"],
    ["id", "id-ID"],
    ["en-US", "en-US"],
    ["fr-FR", "en-US"],
    [null, "en-US"],
    [undefined, "en-US"],
  ])("maps %p to %s", (value, expected) => {
    expect(toEmailLocale(value)).toBe(expected)
  })
})
describe("dictionaries", () => {
  it("have the same keys", () => {
    expect(Object.keys(id).sort()).toEqual(Object.keys(en).sort())
  })
  it("have no empty text", () => {
    for (const v of [...Object.values(en), ...Object.values(id)]) expect(v.trim()).not.toBe("")
  })
})
describe("t", () => {
  it("fills the values", () => {
    expect(t("id-ID", "common.greeting", { name: "Dewi" })).toBe("Halo Dewi,")
  })
  it("falls back to English for an unknown key", () => {
    expect(t("id-ID", "missing.key" as any)).toBe("missing.key")
  })
  it("gives the lang", () => {
    expect([langOf("en-US"), langOf("id-ID")]).toEqual(["en", "id"])
  })
})
