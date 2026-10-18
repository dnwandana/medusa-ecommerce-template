import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { computed, defineComponent, h, nextTick } from "vue"
import type { NuxtError } from "#app"
import { clearNuxtData, useNuxtData } from "#imports"
import ProductPage from "~/pages/products/[handle].vue"
import { STOREFRONT_DEFAULTS } from "~/types/storefront"

const { catalog, storefront, focusPhoto } = vi.hoisted(() => ({
  catalog: { getProductByHandle: vi.fn() },
  storefront: { ensureSettings: vi.fn() },
  focusPhoto: vi.fn(),
}))

mockNuxtImport("useCatalog", () => () => catalog)
mockNuxtImport("useStorefront", () => () => ({
  settings: computed(() => STOREFRONT_DEFAULTS),
  ensureSettings: storefront.ensureSettings,
}))

const shirt = {
  id: "prod_1",
  title: "Relaxed Linen Shirt",
  handle: "relaxed-linen-shirt",
  description: "An easy shirt in washed linen.",
  thumbnail: "/t.jpg",
  categories: [
    {
      id: "cat_shirts",
      name: "Shirts",
      handle: "shirts",
      parent_category: { id: "cat_women", name: "Women", handle: "women" },
    },
  ],
  options: [{ id: "opt_c", title: "Colour", values: [{ value: "Sand" }, { value: "Sage" }] }],
  variants: [
    { id: "v_sand", options: [{ option_id: "opt_c", value: "Sand" }] },
    { id: "v_sage", options: [{ option_id: "opt_c", value: "Sage" }] },
  ],
  images: [
    { id: "img_sand", url: "/sand.jpg", rank: 0, variants: [{ id: "v_sand" }] },
    { id: "img_sage", url: "/sage.jpg", rank: 1, variants: [{ id: "v_sage" }] },
  ],
}

// The stubs keep the props and the events of the real components.
const GalleryStub = defineComponent({
  name: "ProductGallery",
  props: ["images", "title", "badgeLabel"],
  emits: ["open"],
  setup(_, { expose }) {
    expose({ focusPhoto })
    return () => h("div", { "data-testid": "gallery" })
  },
})
const ViewerStub = defineComponent({
  name: "PhotoViewer",
  props: ["open", "images", "title", "startIndex"],
  emits: ["update:open", "closed"],
  setup: () => () => h("div"),
})
const PurchaseStub = defineComponent({
  name: "ProductPurchase",
  props: ["product"],
  emits: ["colour-change"],
  setup:
    (_, { slots }) =>
    () =>
      h("div", { "data-testid": "purchase" }, slots.default?.()),
})
const DetailsStub = defineComponent({
  name: "ProductDetails",
  props: ["product"],
  setup: () => () => h("div"),
})
const RelatedStub = defineComponent({
  name: "RelatedProducts",
  props: ["sourceKey", "source"],
  setup: () => () => h("section"),
})
const ReviewsStub = defineComponent({
  name: "ReviewList",
  props: ["productId"],
  setup: () => () => h("section", { id: "reviews" }),
})

const mountPage = () =>
  mountSuspended(ProductPage, {
    route: "/products/relaxed-linen-shirt",
    global: {
      stubs: {
        ProductGallery: GalleryStub,
        PhotoViewer: ViewerStub,
        ProductPurchase: PurchaseStub,
        ProductDetails: DetailsStub,
        RelatedProducts: RelatedStub,
        ReviewList: ReviewsStub,
      },
    },
  })

beforeEach(() => {
  clearNuxtData()
  catalog.getProductByHandle.mockReset().mockResolvedValue(shirt)
  storefront.ensureSettings.mockReset().mockResolvedValue(STOREFRONT_DEFAULTS)
  focusPhoto.mockReset()
})

describe("product page", () => {
  it("shows the breadcrumbs with the parent and the category", async () => {
    const breadcrumb = (await mountPage()).get('nav[aria-label="Breadcrumb"]')
    expect(breadcrumb.findAll("a").map((link) => [link.text(), link.attributes("href")])).toEqual([
      ["Home", "/"],
      ["Women", "/categories/women"],
      ["Shirts", "/categories/shirts"],
    ])
    expect(breadcrumb.get('[aria-current="page"]').text()).toBe("Relaxed Linen Shirt")
  })

  it("shows Products in the breadcrumbs for a product with no category", async () => {
    catalog.getProductByHandle.mockResolvedValue({ ...shirt, categories: [] })
    const breadcrumb = (await mountPage()).get('nav[aria-label="Breadcrumb"]')
    expect(breadcrumb.findAll("a").map((link) => [link.text(), link.attributes("href")])).toEqual([
      ["Home", "/"],
      ["Products", "/products"],
    ])
  })

  it("puts the title first in the detail column and the description in the purchase block", async () => {
    const wrapper = await mountPage()
    const column = wrapper.get("[data-testid='product-detail']")
    expect(column.element.firstElementChild?.tagName).toBe("H1")
    expect(wrapper.get("[data-testid='purchase']").text()).toContain(
      "An easy shirt in washed linen."
    )
    expect(wrapper.text()).not.toContain("Size guide")
  })

  it("loads the store settings", async () => {
    await mountPage()
    expect(storefront.ensureSettings).toHaveBeenCalled()
  })

  it("shows the photos of the selected colour", async () => {
    const wrapper = await mountPage()
    const gallery = wrapper.findComponent({ name: "ProductGallery" })
    expect(gallery.props("images").map((image: { id: string }) => image.id)).toEqual(["img_sand"])

    wrapper.findComponent({ name: "ProductPurchase" }).vm.$emit("colour-change", "Sage")
    await nextTick()
    expect(gallery.props("images").map((image: { id: string }) => image.id)).toEqual(["img_sage"])
  })

  it("gives the badge label to the gallery", async () => {
    const wrapper = await mountPage()
    // The variants of the fixture have no stock fields, so the product is sold out.
    expect(wrapper.findComponent({ name: "ProductGallery" }).props("badgeLabel")).toBe("Sold out")
  })

  it("opens the viewer at the photo and gives the focus back on close", async () => {
    const wrapper = await mountPage()
    wrapper.findComponent({ name: "ProductGallery" }).vm.$emit("open", 1)
    await nextTick()
    const viewer = wrapper.findComponent({ name: "PhotoViewer" })
    expect(viewer.props()).toMatchObject({ open: true, startIndex: 1 })

    viewer.vm.$emit("closed", 1)
    expect(focusPhoto).toHaveBeenCalledWith(1)
  })

  it("shows the rating link only when the product has reviews", async () => {
    const wrapper = await mountPage()
    expect(wrapper.find("a[href='#reviews']").exists()).toBe(false)

    useNuxtData("reviews:prod_1").data.value = {
      reviews: [],
      count: 13,
      limit: 3,
      offset: 0,
      average_rating: 4.8,
    }
    await nextTick()
    expect(wrapper.get("a[href='#reviews']").text()).toContain("4.8")
  })

  it("shows the related products, the reviews and no trust lines", async () => {
    const wrapper = await mountPage()
    expect(wrapper.findComponent({ name: "RelatedProducts" }).props("source")).toEqual({
      productId: "prod_1",
      categories: shirt.categories,
      excludeIds: [],
    })
    expect(wrapper.findComponent({ name: "RelatedProducts" }).props("sourceKey")).toBe("prod_1")
    expect(wrapper.findComponent({ name: "ReviewList" }).props("productId")).toBe("prod_1")
    expect(wrapper.findComponent({ name: "TrustLines" }).exists()).toBe(false)
  })

  it("throws a 404 with the message key", async () => {
    catalog.getProductByHandle.mockResolvedValue(null)
    await mountSuspended(ProductPage, { route: "/products/missing" })
    // mountSuspended does not reject. The fatal error goes to the Nuxt error state.
    const error = useError().value as NuxtError
    await clearError()
    expect(error.statusCode).toBe(404)
    expect(error.data).toEqual({ messageKey: "products.notFound" })
    expect(error.statusMessage ?? "").not.toContain("not")
  })
})
