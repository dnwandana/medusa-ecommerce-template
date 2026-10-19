import { flushPromises } from "@vue/test-utils"
import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { LanguageSwitcher } from "#components"

const { i18n } = await vi.hoisted(async () => {
  const { ref } = await import("vue")
  return {
    i18n: {
      locale: ref("en"),
      // No name here: the names must come from the locale files.
      locales: ref([{ code: "en" }, { code: "id" }]),
      setLocale: vi.fn(),
    },
  }
})

// The real t() reads the locale files. The mock keeps control of the locale and setLocale.
mockNuxtImport("useI18n", () => () => ({ ...i18n, t: useNuxtApp().$i18n.t }))

afterEach(async () => {
  document.body.innerHTML = ""
  await useNuxtApp().$i18n.setLocale("en")
})

beforeEach(() => {
  i18n.locale.value = "en"
  i18n.setLocale.mockReset()
})

const open = async (wrapper: Awaited<ReturnType<typeof mountSuspended>>) => {
  const trigger = wrapper.find("button")
  await trigger.trigger("pointerdown", { button: 0, ctrlKey: false })
  await trigger.trigger("click")
}

const radioItems = () =>
  [...document.body.querySelectorAll('[role="menuitemradio"]')] as HTMLElement[]

describe("LanguageSwitcher", () => {
  it("shows the short code in the header and the language names in the menu", async () => {
    const wrapper = await mountSuspended(LanguageSwitcher, { attachTo: document.body })
    const button = wrapper.get("button")

    expect(button.text()).toBe("EN")
    expect(button.attributes("aria-label")).toBe("Language")
    expect(button.classes()).toEqual(expect.arrayContaining(["h-11", "text-nav"]))
    await open(wrapper)
    expect(document.body.querySelector("[role='menu']")?.textContent).toContain("Language")
    expect(radioItems().map((item) => item.textContent?.trim())).toEqual([
      "English",
      "Bahasa Indonesia",
    ])
  })

  it("shows the code and the name in the footer", async () => {
    const wrapper = await mountSuspended(LanguageSwitcher, { props: { variant: "footer" } })

    expect(wrapper.get("button").text()).toBe("EN · English")
    expect(wrapper.get("button").find("svg").exists()).toBe(true)
  })

  it("checks the current language", async () => {
    i18n.locale.value = "id"
    const wrapper = await mountSuspended(LanguageSwitcher, { attachTo: document.body })
    await open(wrapper)

    expect(radioItems().map((item) => item.getAttribute("aria-checked"))).toEqual(["false", "true"])
  })

  it("changes the language through setLocale, which writes the cookie", async () => {
    const wrapper = await mountSuspended(LanguageSwitcher, { attachTo: document.body })
    await open(wrapper)

    radioItems()[1]!.click()

    expect(i18n.setLocale).toHaveBeenCalledWith("id")
  })

  it("keeps the query when the language changes", async () => {
    // The real setLocale changes the route, so this test does not use the mock.
    i18n.setLocale.mockImplementation((code: string) => useNuxtApp().$i18n.setLocale(code))
    const wrapper = await mountSuspended(LanguageSwitcher, {
      route: "/products/plain-t-shirt?variant=v2",
    })
    await open(wrapper)

    radioItems()[1]!.click()
    expect(i18n.setLocale).toHaveBeenCalledWith("id")
    await i18n.setLocale.mock.results[0]!.value
    await flushPromises()

    expect(useRoute().fullPath).toBe("/id/products/plain-t-shirt?variant=v2")
  })

  it("shows the full-width outline form in the sheet", async () => {
    const wrapper = await mountSuspended(LanguageSwitcher, {
      props: { variant: "sheet" },
      attachTo: document.body,
    })

    expect(wrapper.find("button").classes()).toContain("w-full")
    expect(wrapper.find("button").text()).toBe("English")
  })
})
