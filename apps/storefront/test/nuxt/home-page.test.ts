import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { clearNuxtData, useNuxtApp } from "#imports"
import HomePage from "~/pages/index.vue"
import type { HomeCategory } from "~/composables/useHomeCategories"
import { STOREFRONT_DEFAULTS, type StoreContact } from "~/types/storefront"
import { readHead } from "./helpers/head"

const { catalog, storefront, customerState, homeCategories } = await vi.hoisted(async () => {
  const { computed, ref } = await import("vue")
  const { STOREFRONT_DEFAULTS } = await import("~/types/storefront")
  return {
    catalog: { listProducts: vi.fn() },
    storefront: {
      getHomeCampaign: vi.fn(),
      ensureSettings: vi.fn(),
      settings: computed(() => STOREFRONT_DEFAULTS),
    },
    customerState: { customer: ref(null), ensureLoaded: () => Promise.resolve() },
    homeCategories: ref<HomeCategory[]>([]),
  }
})

mockNuxtImport("useCatalog", () => () => catalog)
mockNuxtImport("useStorefront", () => () => storefront)
// The hearts of the cards load the customer. A guest makes no wishlist request.
mockNuxtImport("useCustomer", () => () => customerState)
mockNuxtImport("useHomeCategories", () => () => ({
  categories: computed(() => homeCategories.value),
  pending: ref(false),
}))

const CAMPAIGN = {
  id: "hc_1",
  image_url: "https://assets.example/hero.jpg",
  mobile_image_url: null,
  eyebrow: "Autumn",
  title: "The quiet season",
  text: "Light shirts for warm days.",
  button_label: "Shop linen",
  link: "/categories/linen",
}

const CONTACT: StoreContact = {
  email: "hello@shop.example",
  phone: "+622155500100",
  whatsapp: "+6281234567890",
  address: null,
  social_links: [
    { network: "instagram", url: "https://instagram.com/store" },
    { network: "shopee", url: "https://shopee.co.id/store" },
  ],
}

const PRODUCT = {
  id: "prod_1",
  title: "Plain T-Shirt",
  handle: "plain-t-shirt",
  thumbnail: null,
  variants: [],
}

beforeEach(() => {
  clearNuxtData()
  homeCategories.value = []
  storefront.getHomeCampaign.mockReset().mockResolvedValue(null)
  catalog.listProducts.mockReset().mockResolvedValue({ products: [PRODUCT], count: 1 })
  storefront.ensureSettings.mockReset().mockResolvedValue({
    ...STOREFRONT_DEFAULTS,
    contact: CONTACT,
  })
})

afterEach(async () => {
  await useNuxtApp().$i18n.setLocale("en")
})

describe("home page", () => {
  it("shows the text hero when no campaign is live", async () => {
    const wrapper = await mountSuspended(HomePage)

    expect(wrapper.find("h1").text()).toBe("Clothes for the days you actually have.")
  })

  it("shows the live campaign in the hero", async () => {
    storefront.getHomeCampaign.mockResolvedValue({ ...CAMPAIGN, title: "The *linen* edit" })
    const wrapper = await mountSuspended(HomePage)

    expect(wrapper.find("h1 em").text()).toBe("linen")
  })

  it("shows the 4 newest products under New in", async () => {
    const wrapper = await mountSuspended(HomePage)

    expect(catalog.listProducts).toHaveBeenCalledWith({ limit: 4 })
    expect(wrapper.text()).toContain("Just arrived")
    expect(wrapper.find("h2").text()).toBe("New in")
    expect(wrapper.find("[data-testid='new-in'] a[href='/products']").text()).toBe("View all")
    expect(wrapper.findAll("[data-testid='card-photo']")).toHaveLength(1)
  })

  it("shows the grid error state and loads the products again on Try again", async () => {
    catalog.listProducts.mockRejectedValue(new Error("HTTP 500"))
    const wrapper = await mountSuspended(HomePage)

    expect(wrapper.find("[role='alert']").text()).toBe("An error occurred. Try again.")

    catalog.listProducts.mockResolvedValue({ products: [PRODUCT], count: 1 })
    await wrapper.get("[data-testid='new-in'] button").trigger("click")
    await flushPromises()

    expect(catalog.listProducts).toHaveBeenCalledTimes(2)
    expect(wrapper.findAll("[data-testid='card-photo']")).toHaveLength(1)
  })

  it("keeps the live campaign when the products do not load", async () => {
    storefront.getHomeCampaign.mockResolvedValue(CAMPAIGN)
    catalog.listProducts.mockRejectedValue(new Error("HTTP 500"))
    const wrapper = await mountSuspended(HomePage)

    expect(wrapper.find("h1").text()).toBe("The quiet season")
    expect(wrapper.find("[role='alert']").exists()).toBe(true)
  })

  it("shows the category tiles in the given order, and no section with no tile", async () => {
    homeCategories.value = [
      { id: "c_1", name: "Shirts", handle: "shirts", image: "https://assets.example/s.jpg" },
      { id: "c_2", name: "Trousers", handle: "trousers", image: null },
    ]
    const wrapper = await mountSuspended(HomePage)
    const tiles = wrapper.findAll("[data-testid='category-tile']")

    expect(tiles.map((tile) => tile.text())).toEqual(["Shirts", "Trousers"])
    expect(tiles[0]!.attributes("href")).toBe("/categories/shirts")
    expect(tiles[0]!.find("img").attributes("src")).toBe("https://assets.example/s.jpg")
    expect(tiles[1]!.find("img").exists()).toBe(false)

    homeCategories.value = []
    const empty = await mountSuspended(HomePage)
    expect(empty.text()).not.toContain("Shop by category")
  })

  it("shows the three service items", async () => {
    const wrapper = await mountSuspended(HomePage)
    const row = wrapper.find("section[aria-label='Our service']")

    expect(row.findAll("h3").map((title) => title.text())).toEqual([
      "Delivered to your door",
      "Complimentary returns",
      "Fit advice",
    ])
  })

  it("writes the home head with the store name first", async () => {
    await mountSuspended(HomePage, { route: "/" })
    const head = await readHead()

    expect(head.title).toBe("Everyday – Clothes for the days you actually have.")
    expect(head.meta("description")).toBe(
      "Made for most days. Relaxed shirts, wide-leg chinos and the pieces you reach for without thinking."
    )
    expect(head.meta("og:image")).toBe("http://localhost:3000/og-default.jpg")
    expect(head.links("canonical")).toEqual([{ href: "http://localhost:3000/" }])
  })

  it("writes the OnlineStore and the WebSite", async () => {
    await mountSuspended(HomePage, { route: "/" })
    const [store, site] = (await readHead()).jsonLd()

    expect(store).toMatchObject({
      "@type": "OnlineStore",
      name: "Everyday",
      url: "http://localhost:3000",
      logo: "http://localhost:3000/logo.png",
      email: "hello@shop.example",
      telephone: "+622155500100",
      sameAs: ["https://instagram.com/store", "https://shopee.co.id/store"],
      hasMerchantReturnPolicy: { merchantReturnLink: "http://localhost:3000/returns" },
    })
    expect(store).not.toHaveProperty("address")
    expect(site).toMatchObject({ "@type": "WebSite", inLanguage: "en-US" })
  })

  it("writes the Indonesian return link and language on /id", async () => {
    await mountSuspended(HomePage, { route: "/id" })
    const [store, site] = (await readHead()).jsonLd()

    expect(store).toMatchObject({
      hasMerchantReturnPolicy: { merchantReturnLink: "http://localhost:3000/id/returns" },
    })
    expect(site).toMatchObject({ "@type": "WebSite", inLanguage: "id-ID" })
  })

  it("writes the OnlineStore with no email when the contact request fails", async () => {
    storefront.ensureSettings.mockRejectedValue(new Error("down"))
    const wrapper = await mountSuspended(HomePage, { route: "/" })

    expect((await readHead()).jsonLd()[0]).not.toHaveProperty("email")
    // The page still shows its content.
    expect(wrapper.find("h1").exists()).toBe(true)
  })
})
