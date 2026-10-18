import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { clearNuxtData } from "#imports"
import HomePage from "~/pages/index.vue"
import type { HomeCategory } from "~/composables/useHomeCategories"

const { catalog, storefront, customerState, homeCategories } = await vi.hoisted(async () => {
  const { computed, ref } = await import("vue")
  const { STOREFRONT_DEFAULTS } = await import("~/types/storefront")
  return {
    catalog: { listProducts: vi.fn() },
    storefront: {
      getHomeCampaign: vi.fn(),
      ensureSettings: () => Promise.resolve(STOREFRONT_DEFAULTS),
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
})
