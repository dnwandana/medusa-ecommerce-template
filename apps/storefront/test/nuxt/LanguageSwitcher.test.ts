import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { LanguageSwitcher } from "#components"

const { i18n } = await vi.hoisted(async () => {
  const { ref } = await import("vue")
  return {
    i18n: {
      locale: ref("en"),
      locales: ref([
        { code: "en", name: "English" },
        { code: "id", name: "Bahasa Indonesia" },
      ]),
      setLocale: vi.fn(),
    },
  }
})

mockNuxtImport("useI18n", () => () => i18n)

beforeEach(() => {
  i18n.locale.value = "en"
  i18n.setLocale.mockReset()
})

describe("LanguageSwitcher", () => {
  it("shows one button for each language", async () => {
    const wrapper = await mountSuspended(LanguageSwitcher)

    expect(wrapper.findAll("button").map((button) => button.text())).toEqual([
      "English",
      "Bahasa Indonesia",
    ])
  })

  it("marks the active language", async () => {
    i18n.locale.value = "id"
    const wrapper = await mountSuspended(LanguageSwitcher)

    const [english, indonesian] = wrapper.findAll("button")
    expect(english?.attributes("aria-current")).toBeUndefined()
    expect(indonesian?.attributes("aria-current")).toBe("true")
  })

  it("changes the language through setLocale, which writes the cookie", async () => {
    const wrapper = await mountSuspended(LanguageSwitcher)

    await wrapper.findAll("button")[1]!.trigger("click")

    expect(i18n.setLocale).toHaveBeenCalledWith("id")
  })
})
