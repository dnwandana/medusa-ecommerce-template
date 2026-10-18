import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime"
import { describe, expect, it, vi } from "vitest"
import { defineComponent, h } from "vue"

const listCategories = vi.fn()
mockNuxtImport("useCatalog", () => () => ({ listCategories }))

const Probe = defineComponent({
  setup() {
    const a = useNavCategories()
    const b = useNavCategories()
    return () =>
      h("p", `${a.categories.value.map((c) => c.handle).join(",")}|${b.categories.value.length}`)
  },
})

describe("useNavCategories", () => {
  it("keeps the top-level categories and shares one request", async () => {
    listCategories.mockResolvedValue([
      { id: "c1", name: "Clothing", handle: "clothing", parent_category_id: null },
      { id: "c2", name: "Apparel", handle: "apparel", parent_category_id: "c1" },
      { id: "c3", name: "Kitchen", handle: "kitchen", parent_category_id: null },
    ])
    const wrapper = await mountSuspended(Probe)
    expect(wrapper.text()).toBe("clothing,kitchen|2")
    expect(listCategories).toHaveBeenCalledTimes(1)
  })

  it("gives an empty list when the request fails", async () => {
    clearNuxtData("nav-categories")
    listCategories.mockRejectedValue(new Error("down"))
    const wrapper = await mountSuspended(Probe)
    expect(wrapper.text()).toBe("|0")
  })
})
