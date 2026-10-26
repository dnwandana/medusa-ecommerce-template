import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { AppFooter, HairlineAccordion, LanguageSwitcher, TrustLines } from "#components"
import { STOREFRONT_DEFAULTS, type StoreContact, type StorefrontSettings } from "~/types/storefront"

const { homeCategories, storefrontSettings, ensureSettings } = await vi.hoisted(async () => {
  const { ref } = await import("vue")
  const { STOREFRONT_DEFAULTS } = await import("~/types/storefront")
  return {
    homeCategories: ref<{ id: string; name: string; handle: string; image: string | null }[]>([]),
    storefrontSettings: ref<StorefrontSettings>(STOREFRONT_DEFAULTS),
    ensureSettings: vi.fn(),
  }
})

mockNuxtImport("useHomeCategories", () => () => ({
  categories: computed(() => homeCategories.value),
  pending: ref(false),
}))

mockNuxtImport("useStorefront", () => () => ({
  settings: computed(() => storefrontSettings.value),
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

const CONTACT: StoreContact = {
  email: "a.very.long.address.for.the.store@example-store.com",
  phone: "+622155500100",
  whatsapp: "+6281234567890",
  address: "Jl. Sudirman 1",
  social_links: [
    { network: "tiktok", url: "https://tiktok.com/@store" },
    { network: "instagram", url: "https://instagram.com/store" },
  ],
}

const withContact = (contact: StoreContact): StorefrontSettings => ({
  ...STOREFRONT_DEFAULTS,
  contact,
})

beforeEach(() => {
  homeCategories.value = [
    { id: "c1", name: "Women", handle: "women", image: null },
    { id: "c2", name: "Men", handle: "men", image: null },
  ]
  storefrontSettings.value = withContact(NO_CONTACT)
  ensureSettings.mockReset().mockResolvedValue(storefrontSettings.value)
})

describe("TrustLines", () => {
  it("shows the shipping line and the payment line", async () => {
    const wrapper = await mountSuspended(TrustLines)

    expect(wrapper.text()).toContain("We ship to all of Indonesia.")
    expect(wrapper.text()).toContain("Secure payment.")
  })
})

describe("AppFooter", () => {
  it("lists the shop, help and about links", async () => {
    const wrapper = await mountSuspended(AppFooter)
    const desktop = wrapper.get("[data-slot='footer-columns']")
    const hrefs = desktop.findAll("a").map((a) => a.attributes("href"))

    expect(hrefs).toEqual([
      "/categories/women",
      "/categories/men",
      "/products",
      "/delivery",
      "/returns",
      "/contact",
      "/account/orders",
      "/about",
    ])
    expect(desktop.findAll("h2").map((h) => h.text())).toEqual(["Shop", "Help", "About"])
  })

  it("shows only All products in the shop column when no home category exists", async () => {
    homeCategories.value = []
    const wrapper = await mountSuspended(AppFooter)
    const desktop = wrapper.get("[data-slot='footer-columns']")

    expect(desktop.find("a[href^='/categories/']").exists()).toBe(false)
    expect(desktop.find("a[href='/products']").text()).toBe("All products")
  })

  it("gives the phone view a closed accordion with the same columns", async () => {
    const wrapper = await mountSuspended(AppFooter)
    const accordion = wrapper.getComponent(HairlineAccordion)

    expect(accordion.props("items").map((item: { id: string }) => item.id)).toEqual([
      "shop",
      "help",
      "about",
    ])
    expect(accordion.props("defaultOpen") ?? []).toEqual([])
    expect(accordion.find("a[href='/contact']").exists()).toBe(true)
  })

  it("shows the bottom row with the copyright and the payment line", async () => {
    const wrapper = await mountSuspended(AppFooter)
    const bottom = wrapper.get("[data-slot='footer-bottom']")

    expect(bottom.text()).toContain(`© ${new Date().getFullYear()} Everyday`)
    expect(bottom.text()).toContain("We accept bank transfer")
    expect(bottom.find("a[href='/privacy']").exists()).toBe(true)
    expect(bottom.find("a[href='/terms']").exists()).toBe(true)
    expect(bottom.findComponent(LanguageSwitcher).props("variant")).toBe("footer")
  })

  it("has no newsletter and no trust lines", async () => {
    const wrapper = await mountSuspended(AppFooter)

    expect(wrapper.find("input[type='email']").exists()).toBe(false)
    expect(wrapper.text()).not.toContain("Secure payment.")
  })

  describe("Contact column", () => {
    it("shows WhatsApp, email, phone, then the icons in the owner order", async () => {
      storefrontSettings.value = withContact(CONTACT)
      const wrapper = await mountSuspended(AppFooter)
      const column = wrapper.get("[data-slot='footer-columns'] [data-slot='footer-contact']")

      expect(column.get("h2").text()).toBe("Contact")
      expect(column.findAll("a").map((a) => a.attributes("href"))).toEqual([
        "https://wa.me/6281234567890",
        `mailto:${CONTACT.email}`,
        "tel:+622155500100",
        "https://tiktok.com/@store",
        "https://instagram.com/store",
      ])
      expect(column.get("a[href^='https://wa.me/']").text()).toBe("WhatsApp +6281234567890")

      const icons = column.findAll("a[href^='https://'][aria-label]")
      expect(icons.map((a) => a.attributes("aria-label"))).toEqual(["TikTok", "Instagram"])
      for (const icon of icons) {
        expect(icon.attributes("target")).toBe("_blank")
        expect(icon.attributes("rel")).toBe("noopener noreferrer")
        expect(icon.find("svg").exists()).toBe(true)
      }
      // The address shows only on the contact page.
      expect(column.text()).not.toContain("Jl. Sudirman 1")
    })

    it("does not show a link of an unknown network", async () => {
      storefrontSettings.value = withContact({
        ...NO_CONTACT,
        social_links: [
          { network: "myspace", url: "https://myspace.com/store" },
          { network: "line", url: "https://line.me/store" },
        ],
      })
      const wrapper = await mountSuspended(AppFooter)
      const column = wrapper.get("[data-slot='footer-columns'] [data-slot='footer-contact']")

      expect(column.findAll("a").map((a) => a.attributes("href"))).toEqual([
        "https://line.me/store",
      ])
    })

    it("uses four columns of at most 240 px on desktop", async () => {
      storefrontSettings.value = withContact(CONTACT)
      const wrapper = await mountSuspended(AppFooter)

      expect(wrapper.get("[data-slot='footer-columns']").classes()).toContain(
        "md:grid-cols-[repeat(4,minmax(0,240px))]"
      )
    })

    // Review Focus: a long email wraps inside the column.
    it("lets a long email wrap", async () => {
      storefrontSettings.value = withContact(CONTACT)
      const wrapper = await mountSuspended(AppFooter)
      const column = wrapper.get("[data-slot='footer-columns'] [data-slot='footer-contact']")

      expect(column.get("a[href^='mailto:']").classes()).toContain("break-all")
    })

    it("adds Contact as a fourth closed item of the phone accordion", async () => {
      storefrontSettings.value = withContact(CONTACT)
      const wrapper = await mountSuspended(AppFooter)
      const accordion = wrapper.getComponent(HairlineAccordion)

      expect(accordion.props("items")).toEqual([
        { id: "shop", title: "Shop" },
        { id: "help", title: "Help" },
        { id: "about", title: "About" },
        { id: "contact", title: "Contact" },
      ])
      expect(accordion.props("defaultOpen") ?? []).toEqual([])
      expect(accordion.find("a[href='tel:+622155500100']").exists()).toBe(true)
      expect(accordion.find("a[aria-label='TikTok']").exists()).toBe(true)
    })

    // Review Focus: a store with no contact values at all.
    it("keeps three columns and three accordion items with no contact", async () => {
      const wrapper = await mountSuspended(AppFooter)
      const desktop = wrapper.get("[data-slot='footer-columns']")

      expect(wrapper.find("[data-slot='footer-contact']").exists()).toBe(false)
      expect(desktop.classes()).toContain("md:grid-cols-[repeat(3,minmax(0,240px))]")
      expect(desktop.classes()).not.toContain("md:grid-cols-[repeat(4,minmax(0,240px))]")
      expect(wrapper.getComponent(HairlineAccordion).props("items")).toHaveLength(3)
    })

    it("loads the settings after the mount", async () => {
      await mountSuspended(AppFooter)

      expect(ensureSettings).toHaveBeenCalledTimes(1)
    })
  })
})
