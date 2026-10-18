import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { computed, ref } from "vue"
import { RelatedProducts } from "#components"
import { clearNuxtData } from "#imports"
import { STOREFRONT_DEFAULTS } from "~/types/storefront"

const { storefront } = vi.hoisted(() => ({ storefront: { ensureSettings: vi.fn() } }))

// The refs are made when the module runs. The mock reads them only when a test mounts.
const related = {
  products: ref<object[]>([]),
  category: ref<{ id: string; name: string; handle: string } | null>(null),
  pending: ref(false),
}

mockNuxtImport("useRelatedProducts", () => () => related)
mockNuxtImport("useStorefront", () => () => ({
  settings: computed(() => STOREFRONT_DEFAULTS),
  ensureSettings: storefront.ensureSettings,
}))

const SOURCE = { productId: "prod_1", excludeIds: [] }

const product = (id: string) => ({ id, title: id, handle: id, variants: [] })

const mountRelated = () =>
  mountSuspended(RelatedProducts, {
    props: { sourceKey: "prod_1", source: SOURCE },
    global: { stubs: { ProductCard: true } },
  })

beforeEach(() => {
  clearNuxtData()
  related.products.value = []
  related.category.value = null
  related.pending.value = false
  storefront.ensureSettings.mockReset().mockResolvedValue(STOREFRONT_DEFAULTS)
})

describe("RelatedProducts", () => {
  it("shows the title, the category link and one card for each product", async () => {
    related.products.value = [product("prod_a"), product("prod_b")]
    related.category.value = { id: "cat_shirts", name: "Shirts", handle: "shirts" }
    const wrapper = await mountRelated()

    const section = wrapper.get("section")
    expect(wrapper.get("h2").text()).toBe("You may also like")
    expect(section.attributes("aria-labelledby")).toBe(wrapper.get("h2").attributes("id"))
    expect(wrapper.get("a[href='/categories/shirts']").text()).toBe("View all Shirts")
    expect(wrapper.findAllComponents({ name: "ProductCard" })).toHaveLength(2)
    expect(wrapper.findAll("ul > li")).toHaveLength(2)
  })

  it("shows 4 skeleton cards while it loads", async () => {
    related.pending.value = true
    const wrapper = await mountRelated()
    expect(wrapper.findAll("[data-testid='related-skeleton']")).toHaveLength(4)
    expect(wrapper.find("[data-testid='related-skeleton'] a").exists()).toBe(false)
  })

  it("renders nothing when it has no products", async () => {
    related.pending.value = false
    related.products.value = []
    const wrapper = await mountRelated()
    expect(wrapper.find("section").exists()).toBe(false)
  })

  it("loads the settings for the cards", async () => {
    await mountRelated()
    expect(storefront.ensureSettings).toHaveBeenCalled()
  })
})
