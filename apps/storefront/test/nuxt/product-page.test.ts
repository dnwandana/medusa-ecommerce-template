import { flushPromises } from "@vue/test-utils"
import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { computed, defineComponent, h, nextTick } from "vue"
import type { NuxtError } from "#app"
import { clearNuxtData } from "#imports"
import ProductPage from "~/pages/products/[handle].vue"
import { STOREFRONT_DEFAULTS } from "~/types/storefront"
import { formatPrice } from "~/utils/formatPrice"
import { readHead } from "./helpers/head"

const { catalog, storefront, reviews, focusPhoto, asyncDataCalls } = vi.hoisted(() => ({
  catalog: { getProductByHandle: vi.fn() },
  storefront: { ensureSettings: vi.fn() },
  reviews: { listForProduct: vi.fn() },
  focusPhoto: vi.fn(),
  asyncDataCalls: [] as unknown[][],
}))

// The two wrappers record the arguments and call the real functions. A test compares the options
// of the callers of one key.
mockNuxtImport("useAsyncData", (original) => (...args: unknown[]) => {
  asyncDataCalls.push(args)
  return original(...args)
})
mockNuxtImport("useLazyAsyncData", (original) => (...args: unknown[]) => {
  asyncDataCalls.push(args)
  return original(...args)
})

mockNuxtImport("useCatalog", () => () => catalog)
// The review composables call the SDK. The mock SDK gives each review request to
// reviews.listForProduct, so the tests also see the requests of useFirstReviewPage.
mockNuxtImport("useMedusa", () => () => ({
  client: {
    fetch: (path: string, init: { query: { limit: number; offset: number } }) => {
      const [, store, products, productId, list] = path.split("/")
      return store === "store" && products === "products" && list === "reviews"
        ? reviews.listForProduct(productId, init.query)
        : Promise.reject(new Error(`No mock for ${path}`))
    },
  },
}))
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
    {
      id: "v_sand",
      options: [{ option_id: "opt_c", value: "Sand" }],
      calculated_price: { calculated_amount: 450000 },
    },
    {
      id: "v_sage",
      options: [{ option_id: "opt_c", value: "Sage" }],
      calculated_price: { calculated_amount: 450000 },
    },
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
  props: ["product", "startVariantId"],
  emits: ["colour-change", "variant-change"],
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

// `stubs` replaces a default stub. A false value mounts the real component.
const mountPage = (
  route = "/products/relaxed-linen-shirt",
  stubs: Record<string, false> = {},
  attachTo?: HTMLElement
) =>
  mountSuspended(ProductPage, {
    route,
    attachTo,
    global: {
      stubs: {
        ProductGallery: GalleryStub,
        PhotoViewer: ViewerStub,
        ProductPurchase: PurchaseStub,
        ProductDetails: DetailsStub,
        RelatedProducts: RelatedStub,
        ReviewList: ReviewsStub,
        ...stubs,
      },
    },
  })

beforeEach(() => {
  clearNuxtData()
  catalog.getProductByHandle.mockReset().mockResolvedValue(shirt)
  storefront.ensureSettings.mockReset().mockResolvedValue(STOREFRONT_DEFAULTS)
  reviews.listForProduct
    .mockReset()
    .mockResolvedValue({ reviews: [], count: 0, limit: 3, offset: 0, average_rating: 0 })
  focusPhoto.mockReset()
})

// A mount with an /id route switches the locale, so each test starts in English.
afterEach(async () => {
  await useNuxtApp().$i18n.setLocale("en")
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

  it("starts with the variant of the URL and shows its photos", async () => {
    const wrapper = await mountPage("/products/relaxed-linen-shirt?variant=v_sage")
    expect(wrapper.findComponent({ name: "ProductPurchase" }).props("startVariantId")).toBe(
      "v_sage"
    )
    const gallery = wrapper.findComponent({ name: "ProductGallery" })
    expect(gallery.props("images").map((image: { id: string }) => image.id)).toEqual(["img_sage"])
  })

  it("ignores an unknown variant id", async () => {
    const wrapper = await mountPage("/products/relaxed-linen-shirt?variant=v_old")
    expect(wrapper.findComponent({ name: "ProductPurchase" }).props("startVariantId")).toBeNull()
  })

  it("replaces the URL on a variant change, with no new history entry and no new load", async () => {
    const wrapper = await mountPage("/products/relaxed-linen-shirt?ref=wa")
    const router = useRouter()
    const replace = vi.spyOn(router, "replace")
    const push = vi.spyOn(router, "push")
    wrapper.findComponent({ name: "ProductPurchase" }).vm.$emit("variant-change", "v_sage")
    await flushPromises()
    expect(replace).toHaveBeenCalledWith(
      expect.objectContaining({ query: { ref: "wa", variant: "v_sage" } })
    )
    expect(push).not.toHaveBeenCalled()
    expect(catalog.getProductByHandle).toHaveBeenCalledTimes(1)
    replace.mockRestore()
    push.mockRestore()
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
    expect((await mountPage()).find("a[href='#reviews']").exists()).toBe(false)

    clearNuxtData()
    reviews.listForProduct.mockResolvedValue({
      reviews: [],
      count: 13,
      limit: 3,
      offset: 0,
      average_rating: 4.8,
    })
    expect((await mountPage()).get("a[href='#reviews']").text()).toContain("4.8")
  })

  it("loads the review summary before the render", async () => {
    reviews.listForProduct.mockResolvedValue({
      reviews: [],
      count: 13,
      limit: 3,
      offset: 0,
      average_rating: 4.8,
    })
    const wrapper = await mountPage()
    expect(wrapper.get("a[href='#reviews']").text()).toContain("4.8")
    expect(reviews.listForProduct).toHaveBeenCalledTimes(1)
    expect(reviews.listForProduct).toHaveBeenCalledWith("prod_1", { limit: 3, offset: 0 })
  })

  it("sends one review request for the page and the review list", async () => {
    await mountPage(undefined, { ReviewList: false })
    await flushPromises()
    expect(reviews.listForProduct).toHaveBeenCalledTimes(1)
  })

  // In development, Nuxt warns (NUXT_E3004) when two callers of one key have a different handler
  // source, transform, pick, getCachedData, or default. Vitest sets import.meta.dev to false, so
  // Nuxt does not do this check here. Thus the test does the same comparison.
  it("gives the page and the review list the same options for the review key", async () => {
    asyncDataCalls.length = 0
    await mountPage(undefined, { ReviewList: false })
    await flushPromises()
    const source = (value: unknown) => (typeof value === "function" ? String(value) : value)
    const callers = asyncDataCalls
      .filter(([key]) => key === "reviews:prod_1")
      .map(([, handler, options]) => {
        const opts = (options ?? {}) as Record<string, unknown>
        return {
          handler: source(handler),
          transform: source(opts.transform),
          pick: opts.pick,
          getCachedData: source(opts.getCachedData),
          default: source(opts.default),
        }
      })
    expect(callers).toHaveLength(2)
    expect(callers[1]).toEqual(callers[0])
  })

  it("sends no second review request when the first request fails", async () => {
    reviews.listForProduct.mockRejectedValue(new Error("down"))
    const wrapper = await mountPage(undefined, { ReviewList: false })
    await flushPromises()
    expect(reviews.listForProduct).toHaveBeenCalledTimes(1)
    expect(wrapper.find("a[href='#reviews']").exists()).toBe(false)
    expect(wrapper.get("#reviews [role='alert']").text()).toBe("An error occurred. Try again.")
  })

  it("loads new reviews on a new visit to the page", async () => {
    const first = await mountPage(undefined, { ReviewList: false })
    await flushPromises()
    first.unmount()
    await nextTick()
    reviews.listForProduct.mockResolvedValue({
      reviews: [],
      count: 4,
      limit: 3,
      offset: 0,
      average_rating: 3.5,
    })
    const second = await mountPage(undefined, { ReviewList: false })
    await flushPromises()
    expect(reviews.listForProduct).toHaveBeenCalledTimes(2)
    expect(second.get("a[href='#reviews']").text()).toContain("3.5")
  })

  it("scrolls to the reviews with no change to the route", async () => {
    reviews.listForProduct.mockResolvedValue({
      reviews: [],
      count: 13,
      limit: 3,
      offset: 0,
      average_rating: 4.8,
    })
    const wrapper = await mountPage(undefined, {}, document.body)
    const router = useRouter()
    const replace = vi.spyOn(router, "replace")
    const push = vi.spyOn(router, "push")
    const section = document.getElementById("reviews")!
    const scrollIntoView = vi.fn()
    section.scrollIntoView = scrollIntoView

    const click = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 })
    wrapper.get("a[href='#reviews']").element.dispatchEvent(click)
    await flushPromises()

    expect(click.defaultPrevented).toBe(true)
    expect(scrollIntoView).toHaveBeenCalledWith({ block: "start" })
    expect(push).not.toHaveBeenCalled()
    expect(replace).not.toHaveBeenCalled()
    expect(useRoute().hash).toBe("")
    replace.mockRestore()
    push.mockRestore()
  })

  it("lets the browser open the rating link in a new tab", async () => {
    reviews.listForProduct.mockResolvedValue({
      reviews: [],
      count: 13,
      limit: 3,
      offset: 0,
      average_rating: 4.8,
    })
    const wrapper = await mountPage(undefined, {}, document.body)
    const click = new MouseEvent("click", { bubbles: true, cancelable: true, ctrlKey: true })
    // happy-dom follows the link of a click with no preventDefault.
    click.preventDefault = vi.fn()
    wrapper.get("a[href='#reviews']").element.dispatchEvent(click)
    expect(click.preventDefault).not.toHaveBeenCalled()
  })

  // Review Focus: a failed reviews request.
  it("renders the product when the reviews request fails", async () => {
    reviews.listForProduct.mockRejectedValue(new Error("down"))
    const wrapper = await mountPage()
    expect(wrapper.get("h1").text()).toBe("Relaxed Linen Shirt")
    expect(wrapper.find("a[href='#reviews']").exists()).toBe(false)
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

  it("writes the product head with the canonical URL and no variant", async () => {
    await mountPage("/products/relaxed-linen-shirt?variant=v_sage")
    const head = await readHead()
    expect(head.title).toBe("Relaxed Linen Shirt | Everyday")
    expect(head.meta("og:type")).toBe("product")
    expect(head.meta("description")).toBe(
      `Sage · ${formatPrice(450000)} · An easy shirt in washed linen.`
    )
    expect(head.meta("og:image")).toBe("http://localhost:3000/sage.jpg")
    expect(head.meta("og:image:alt")).toBe("Relaxed Linen Shirt")
    expect(head.links("canonical")).toEqual([
      { href: "http://localhost:3000/products/relaxed-linen-shirt" },
    ])
  })

  it("names no variant without ?variant=", async () => {
    await mountPage()
    expect((await readHead()).meta("description")).toBe(
      `${formatPrice(450000)} · An easy shirt in washed linen.`
    )
  })

  it("writes the ProductGroup and the breadcrumbs", async () => {
    reviews.listForProduct.mockResolvedValue({
      reviews: [],
      count: 2,
      limit: 3,
      offset: 0,
      average_rating: 4.5,
    })
    await mountPage()
    const [group, crumbs] = (await readHead()).jsonLd()
    expect(group).toMatchObject({
      "@type": "ProductGroup",
      url: "http://localhost:3000/products/relaxed-linen-shirt",
      aggregateRating: { ratingValue: 4.5, reviewCount: 2 },
    })
    expect(crumbs).toMatchObject({
      "@type": "BreadcrumbList",
      itemListElement: [
        { position: 1, name: "Home", item: "http://localhost:3000/" },
        { position: 2, name: "Women", item: "http://localhost:3000/categories/women" },
        { position: 3, name: "Shirts", item: "http://localhost:3000/categories/shirts" },
        { position: 4, name: "Relaxed Linen Shirt" },
      ],
    })
  })

  it("writes the Products breadcrumb for a product with no category", async () => {
    catalog.getProductByHandle.mockResolvedValue({ ...shirt, categories: [] })
    await mountPage()
    const crumbs = (await readHead()).jsonLd()[1]
    expect(crumbs).toMatchObject({
      itemListElement: [
        { position: 1, name: "Home", item: "http://localhost:3000/" },
        { position: 2, name: "Products", item: "http://localhost:3000/products" },
        { position: 3, name: "Relaxed Linen Shirt" },
      ],
    })
  })

  it("has no aggregateRating when the reviews request fails", async () => {
    reviews.listForProduct.mockRejectedValue(new Error("down"))
    await mountPage()
    expect((await readHead()).jsonLd()[0]).not.toHaveProperty("aggregateRating")
  })

  // Review Focus: a product with no images.
  it("uses the default share image for a product with no images", async () => {
    catalog.getProductByHandle.mockResolvedValue({ ...shirt, images: [], thumbnail: null })
    await mountPage()
    expect((await readHead()).meta("og:image")).toBe("http://localhost:3000/og-default.jpg")
  })

  it("uses the Indonesian URLs on /id", async () => {
    await useNuxtApp().$i18n.setLocale("id")
    await mountPage("/id/products/relaxed-linen-shirt")
    const head = await readHead()
    expect(head.links("canonical")).toEqual([
      { href: "http://localhost:3000/id/products/relaxed-linen-shirt" },
    ])
    expect(head.jsonLd()[1]).toMatchObject({
      itemListElement: [{ position: 1, item: "http://localhost:3000/id" }, {}, {}, {}],
    })
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
