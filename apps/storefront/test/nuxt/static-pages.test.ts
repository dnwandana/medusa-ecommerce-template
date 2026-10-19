import { mountSuspended } from "@nuxt/test-utils/runtime"
import { afterEach, describe, expect, it } from "vitest"
import AboutPage from "~/pages/about.vue"
import DeliveryPage from "~/pages/delivery.vue"
import PrivacyPage from "~/pages/privacy.vue"
import ReturnsPage from "~/pages/returns.vue"
import TermsPage from "~/pages/terms.vue"
import enSource from "~~/i18n/locales/en.json?raw"
import idSource from "~~/i18n/locales/id.json?raw"
import { readHead } from "./helpers/head"

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

  it.each(["delivery", "returns", "about", "privacy", "terms"] as const)(
    "writes the head of the %s page from the locale file",
    async (name) => {
      const pages = {
        delivery: DeliveryPage,
        returns: ReturnsPage,
        about: AboutPage,
        privacy: PrivacyPage,
        terms: TermsPage,
      }
      await mountSuspended(pages[name], { route: `/${name}` })
      const head = await readHead()

      expect(head.title).toBe(`${en.pages[name]!.title} | Everyday`)
      expect(head.meta("description")).toBe(en.pages[name]!.intro)
      expect(head.links("canonical")).toEqual([{ href: `http://localhost:3000/${name}` }])
      expect(head.meta("og:image")).toBe("http://localhost:3000/og-default.jpg")
    }
  )

  it("writes the Bahasa Indonesia head in the id locale", async () => {
    await mountSuspended(DeliveryPage, { route: "/id/delivery" })
    const head = await readHead()

    expect(head.title).toBe(`${id.pages.delivery!.title} | Everyday`)
    expect(head.meta("description")).toBe(id.pages.delivery!.intro)
    expect(head.links("canonical")).toEqual([{ href: "http://localhost:3000/id/delivery" }])
  })

  it("changes the head when the locale changes", async () => {
    await mountSuspended(DeliveryPage, { route: "/delivery" })
    await useNuxtApp().$i18n.setLocale("id")

    expect((await readHead()).meta("description")).toBe(id.pages.delivery!.intro)
  })
})
