import { mountSuspended } from "@nuxt/test-utils/runtime"
import { afterEach, describe, expect, it } from "vitest"
import AboutPage from "~/pages/about.vue"
import DeliveryPage from "~/pages/delivery.vue"
import PrivacyPage from "~/pages/privacy.vue"
import ReturnsPage from "~/pages/returns.vue"
import TermsPage from "~/pages/terms.vue"
import enSource from "~~/i18n/locales/en.json?raw"
import idSource from "~~/i18n/locales/id.json?raw"

// The i18n plugin compiles a plain JSON import into message functions. The raw text keeps the strings.
type Messages = {
  pages: Record<
    string,
    { title: string; intro: string; sections: { heading: string; body: string }[] }
  >
}
const en = JSON.parse(enSource) as Messages
const id = JSON.parse(idSource) as Messages

afterEach(async () => {
  await useNuxtApp().$i18n.setLocale("en")
})

describe("static pages", () => {
  it("renders the delivery text from the locale file", async () => {
    const wrapper = await mountSuspended(DeliveryPage, { route: "/delivery" })
    expect(wrapper.get("h1").text()).toBe("Delivery")
    expect(wrapper.findAll("h2").map((h) => h.text())).toEqual(
      en.pages.delivery!.sections.map((s) => s.heading)
    )
  })

  it("renders the returns page", async () => {
    const wrapper = await mountSuspended(ReturnsPage, { route: "/returns" })
    expect(wrapper.get("h1").text()).toBe("Returns and exchanges")
    expect(wrapper.text()).toContain(en.pages.returns!.intro)
  })

  it.each([
    [AboutPage, "/about", "Our story"],
    [PrivacyPage, "/privacy", "Privacy"],
    [TermsPage, "/terms", "Terms"],
  ])("renders the page at %s", async (page, route, title) => {
    const wrapper = await mountSuspended(page, { route })
    expect(wrapper.get("h1").text()).toBe(title)
    expect(wrapper.findAll("h2").length).toBeGreaterThan(0)
  })

  it("renders the Bahasa Indonesia text in the id locale", async () => {
    await useNuxtApp().$i18n.setLocale("id")
    const wrapper = await mountSuspended(DeliveryPage, { route: "/id/delivery" })
    expect(wrapper.get("h1").text()).toBe(id.pages.delivery!.title)
    expect(wrapper.findAll("h2").map((h) => h.text())).toEqual(
      id.pages.delivery!.sections.map((s) => s.heading)
    )
  })
})
