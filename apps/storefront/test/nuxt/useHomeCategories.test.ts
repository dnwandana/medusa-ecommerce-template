import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime"
import { describe, expect, it, vi } from "vitest"
import { defineComponent, h } from "vue"

const fetch = vi.fn()
mockNuxtImport("useMedusa", () => () => ({ client: { fetch } }))

const Probe = defineComponent({
  setup() {
    const { categories } = useHomeCategories()
    return () => h("p", categories.value.map((c) => `${c.handle}:${c.image ?? "none"}`).join(","))
  },
})

describe("useHomeCategories", () => {
  it("reads the home categories from the storefront route", async () => {
    fetch.mockResolvedValue({
      categories: [
        { id: "c1", name: "Women", handle: "women", image: "https://x/w.jpg" },
        { id: "c2", name: "Men", handle: "men", image: null },
      ],
    })
    const wrapper = await mountSuspended(Probe)
    expect(fetch).toHaveBeenCalledWith("/store/storefront/home-categories")
    expect(wrapper.text()).toBe("women:https://x/w.jpg,men:none")
  })

  it("gives an empty list when the request fails", async () => {
    clearNuxtData("home-categories")
    fetch.mockRejectedValue(new Error("down"))
    const wrapper = await mountSuspended(Probe)
    expect(wrapper.text()).toBe("")
  })
})
