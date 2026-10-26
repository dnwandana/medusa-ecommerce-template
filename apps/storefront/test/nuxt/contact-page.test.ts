import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import ContactPage from "~/pages/contact.vue"
import enSource from "~~/i18n/locales/en.json?raw"
import idSource from "~~/i18n/locales/id.json?raw"
import { STOREFRONT_DEFAULTS, type StoreContact, type StorefrontSettings } from "~/types/storefront"
import { readHead } from "./helpers/head"

// The i18n plugin compiles a plain JSON import into message functions. The raw text keeps the strings.
type Messages = { pages: { contact: { title: string; intro: string } } }
const en = JSON.parse(enSource) as Messages
const id = JSON.parse(idSource) as Messages

const { ensureSettings } = vi.hoisted(() => ({ ensureSettings: vi.fn() }))
mockNuxtImport("useStorefront", () => () => ({
  settings: computed(() => STOREFRONT_DEFAULTS),
  ensureSettings,
  getHomeCampaign: vi.fn(),
}))

const NO_CONTACT: StoreContact = {
  email: null,
  phone: null,
  whatsapp: null,
  address: null,
  social_links: [],
}

const withContact = (contact: Partial<StoreContact>): StorefrontSettings => ({
  ...STOREFRONT_DEFAULTS,
  contact: { ...NO_CONTACT, ...contact },
})

beforeEach(() => {
  clearNuxtData()
  ensureSettings.mockReset().mockResolvedValue(withContact({}))
})

afterEach(async () => {
  await useNuxtApp().$i18n.setLocale("en")
})

describe("contact page", () => {
  it("shows WhatsApp, email, phone, and address in that order", async () => {
    ensureSettings.mockResolvedValue(
      withContact({
        whatsapp: "+62 812-3456-7890",
        email: "halo@store.id",
        phone: "+622155500100",
        address: "Jl. Sudirman 1\nJakarta 10220",
      })
    )
    const wrapper = await mountSuspended(ContactPage, { route: "/contact" })

    expect(wrapper.get("h1").text()).toBe("Contact us")
    expect(
      wrapper.findAll("[data-testid^='contact-']").map((row) => row.attributes("data-testid"))
    ).toEqual(["contact-whatsapp", "contact-email", "contact-phone", "contact-address"])
    expect(wrapper.get("a[href='https://wa.me/6281234567890']").text()).toBe("+62 812-3456-7890")
    expect(wrapper.get("a[href='mailto:halo@store.id']").text()).toBe("halo@store.id")
    expect(wrapper.get("a[href='tel:+622155500100']").text()).toBe("+622155500100")
    expect(wrapper.get("[data-testid='contact-phone']").text()).toContain("Phone")
    expect(wrapper.get("[data-testid='contact-address']").text()).toContain("Address")
  })

  // Review Focus: an address with line breaks.
  it("keeps the line breaks of the address", async () => {
    ensureSettings.mockResolvedValue(withContact({ address: "Jl. Sudirman 1\nJakarta 10220" }))
    const wrapper = await mountSuspended(ContactPage, { route: "/contact" })
    const row = wrapper.get("[data-testid='contact-address']")
    const value = row.get(".whitespace-pre-line")

    expect(value.element.textContent).toBe("Jl. Sudirman 1\nJakarta 10220")
    expect(row.find("a").exists()).toBe(false)
  })

  it("shows only the values that are set", async () => {
    ensureSettings.mockResolvedValue(withContact({ email: "halo@store.id" }))
    const wrapper = await mountSuspended(ContactPage, { route: "/contact" })

    expect(wrapper.find("a[href^='https://wa.me/']").exists()).toBe(false)
    expect(wrapper.find("a[href^='tel:']").exists()).toBe(false)
    expect(wrapper.find("[data-testid='contact-address']").exists()).toBe(false)
    expect(wrapper.get("a[href='mailto:halo@store.id']").exists()).toBe(true)
    expect(wrapper.text()).not.toContain("Social links")
    expect(wrapper.text()).not.toContain("The contact details did not load.")
  })

  it("lists the social links with the icon and the network name", async () => {
    ensureSettings.mockResolvedValue(
      withContact({
        email: "halo@store.id",
        social_links: [
          { network: "line", url: "https://line.me/R/ti/p/@store" },
          { network: "shopee", url: "https://shopee.co.id/store" },
        ],
      })
    )
    const wrapper = await mountSuspended(ContactPage, { route: "/contact" })
    const section = wrapper.get("[data-testid='contact-social-links']")

    expect(section.get("h2").text()).toBe("Social links")
    const links = section.findAll("a")
    expect(links.map((a) => a.attributes("href"))).toEqual([
      "https://line.me/R/ti/p/@store",
      "https://shopee.co.id/store",
    ])
    expect(links.map((a) => a.text())).toEqual(["LINE", "Shopee"])
    for (const link of links) {
      expect(link.attributes("target")).toBe("_blank")
      expect(link.attributes("rel")).toBe("noopener noreferrer")
      expect(link.find("svg").exists()).toBe(true)
    }
  })

  it("does not list a link of an unknown network", async () => {
    ensureSettings.mockResolvedValue(
      withContact({
        social_links: [
          { network: "myspace", url: "https://myspace.com/store" },
          { network: "line", url: "https://line.me/R/ti/p/@store" },
        ],
      })
    )
    const wrapper = await mountSuspended(ContactPage, { route: "/contact" })

    expect(
      wrapper
        .get("[data-testid='contact-social-links']")
        .findAll("a")
        .map((a) => a.text())
    ).toEqual(["LINE"])
  })

  it("shows the unavailable text when the store has no contact values", async () => {
    const wrapper = await mountSuspended(ContactPage, { route: "/contact" })
    expect(wrapper.text()).toContain("The contact details did not load. Try again later.")
  })

  it("shows the social links without the unavailable text when only links exist", async () => {
    ensureSettings.mockResolvedValue(
      withContact({ social_links: [{ network: "line", url: "https://line.me/R/ti/p/@store" }] })
    )
    const wrapper = await mountSuspended(ContactPage, { route: "/contact" })

    expect(wrapper.find("[data-testid='contact-social-links']").exists()).toBe(true)
    expect(wrapper.text()).not.toContain("The contact details did not load.")
  })

  it("shows the unavailable text when the request fails", async () => {
    ensureSettings.mockRejectedValue(new Error("down"))
    const wrapper = await mountSuspended(ContactPage, { route: "/contact" })
    expect(wrapper.text()).toContain("The contact details did not load. Try again later.")
  })

  it("writes the contact head from the locale file", async () => {
    await mountSuspended(ContactPage, { route: "/contact" })
    const head = await readHead()

    expect(head.title).toBe(`${en.pages.contact.title} | Everyday`)
    expect(head.meta("description")).toBe(en.pages.contact.intro)
    expect(head.links("canonical")).toEqual([{ href: "http://localhost:3000/contact" }])
    expect(head.meta("og:image")).toBe("http://localhost:3000/og-default.jpg")
  })

  it("writes the Bahasa Indonesia contact head in the id locale", async () => {
    await mountSuspended(ContactPage, { route: "/id/contact" })
    const head = await readHead()

    expect(head.title).toBe(`${id.pages.contact.title} | Everyday`)
    expect(head.meta("description")).toBe(id.pages.contact.intro)
  })
})
