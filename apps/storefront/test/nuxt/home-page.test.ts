import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { clearNuxtData } from "#imports"
import { ProductGrid } from "#components"
import HomePage from "~/pages/index.vue"

const { catalog } = vi.hoisted(() => ({ catalog: { listProducts: vi.fn() } }))

mockNuxtImport("useCatalog", () => () => catalog)

beforeEach(() => {
  clearNuxtData()
  catalog.listProducts.mockReset().mockResolvedValue({
    products: [
      {
        id: "prod_1",
        title: "Plain T-Shirt",
        handle: "plain-t-shirt",
        thumbnail: null,
        variants: [],
      },
    ],
    count: 1,
  })
})

describe("home page", () => {
  it("shows the text-only hero with the link to all products", async () => {
    const wrapper = await mountSuspended(HomePage)
    const hero = wrapper.find("section")

    expect(hero.classes()).toEqual(expect.arrayContaining(["bg-backdrop-sand", "rounded-xl"]))
    expect(hero.find("h1").text()).toBe("Clothes for the days you actually have.")
    expect(hero.find('a[href="/products"]').text()).toBe("View all products")
    expect(hero.find("img").exists()).toBe(false)
  })

  it("shows the 8 newest products in the product grid", async () => {
    const wrapper = await mountSuspended(HomePage)

    expect(catalog.listProducts).toHaveBeenCalledWith({ limit: 8 })
    expect(wrapper.findComponent(ProductGrid).props("products")).toHaveLength(1)
  })

  it("passes the load error to the product grid", async () => {
    catalog.listProducts.mockRejectedValue(new Error("HTTP 500"))
    const wrapper = await mountSuspended(HomePage)

    expect(wrapper.find('[role="alert"]').text()).toBe("An error occurred. Try again.")
  })
})
