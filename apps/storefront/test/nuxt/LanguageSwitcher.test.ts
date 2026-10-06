import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
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

afterEach(() => {
  document.body.innerHTML = ""
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

const radioItems = () => [...document.body.querySelectorAll('[role="menuitemradio"]')] as HTMLElement[]

describe("LanguageSwitcher", () => {
  it("shows the code of the current language in the header form", async () => {
    const wrapper = await mountSuspended(LanguageSwitcher, { attachTo: document.body })

    expect(wrapper.find("button").text()).toBe("EN")
    expect(wrapper.find("button").attributes("aria-label")).toBe("Language")
  })

  it("shows one radio item for each language", async () => {
    const wrapper = await mountSuspended(LanguageSwitcher, { attachTo: document.body })
    await open(wrapper)

    expect(radioItems().map((item) => item.textContent?.trim())).toEqual(["English", "Bahasa Indonesia"])
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

  it("shows the full-width outline form in the sheet", async () => {
    const wrapper = await mountSuspended(LanguageSwitcher, { props: { variant: "sheet" }, attachTo: document.body })

    expect(wrapper.find("button").classes()).toContain("w-full")
    expect(wrapper.find("button").text()).toBe("English")
  })
})
