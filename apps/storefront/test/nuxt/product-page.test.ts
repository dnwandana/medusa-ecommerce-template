import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { clearNuxtData } from "#imports"
import { TrustLines } from "#components"
import ProductPage from "~/pages/products/[handle].vue"

const { catalog } = vi.hoisted(() => ({ catalog: { getProductByHandle: vi.fn() } }))

mockNuxtImport("useCatalog", () => () => catalog)

const shirt = {
  id: "prod_1",
  title: "Plain T-Shirt",
  handle: "plain-t-shirt",
  description: "A soft shirt for most days.",
  thumbnail: "https://images.example/shirt.png",
  options: [],
  variants: [],
}

const mountPage = () =>
  mountSuspended(ProductPage, {
    route: "/products/plain-t-shirt",
    global: {
      stubs: {
        ProductPurchase: { template: '<div data-testid="purchase"><slot /></div>' },
        ReviewList: { template: '<section data-testid="reviews" />' },
      },
    },
  })

beforeEach(() => {
  clearNuxtData()
  catalog.getProductByHandle.mockReset().mockResolvedValue(shirt)
})

describe("product page", () => {
  it("shows the breadcrumb with the product title", async () => {
    const wrapper = await mountPage()
    const breadcrumb = wrapper.find('nav[aria-label="Breadcrumb"]')

    expect(breadcrumb.find('a[href="/"]').text()).toBe("Home")
    expect(breadcrumb.find('a[href="/products"]').text()).toBe("Products")
    expect(breadcrumb.find('[aria-current="page"]').text()).toBe("Plain T-Shirt")
  })

  it("shows the image in a 3:4 frame and the title", async () => {
    const wrapper = await mountPage()

    expect(wrapper.html()).toContain("padding-bottom: 133.3")
    expect(wrapper.find("img").attributes("alt")).toBe("Plain T-Shirt")
    expect(wrapper.find("h1").text()).toBe("Plain T-Shirt")
  })

  it("puts the description in the purchase block after the price", async () => {
    const wrapper = await mountPage()

    expect(wrapper.find('[data-testid="purchase"]').text()).toContain("A soft shirt for most days.")
  })

  it("shows the trust lines and the reviews", async () => {
    const wrapper = await mountPage()

    expect(wrapper.findComponent(TrustLines).exists()).toBe(true)
    expect(wrapper.find('[data-testid="reviews"]').exists()).toBe(true)
  })

  it("uses two columns with a gap of 64px from md", async () => {
    const wrapper = await mountPage()

    expect(wrapper.find(".grid").classes()).toEqual(
      expect.arrayContaining(["md:grid-cols-2", "md:gap-16"])
    )
  })
})
