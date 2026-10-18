import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime"
import { describe, expect, it, vi } from "vitest"
import ErrorPage from "~/error.vue"

mockNuxtImport("useNavCategories", () => () => ({
  categories: computed(() => [{ id: "c1", name: "Clothing", handle: "clothing" }]),
  pending: ref(false),
}))

// The layout shows the header and the footer. No test calls a real backend.
mockNuxtImport("useCatalog", () => () => ({ listCategories: vi.fn().mockResolvedValue([]) }))
mockNuxtImport("useCart", () => () => ({
  itemCount: ref(0),
  load: vi.fn().mockResolvedValue(undefined),
}))
mockNuxtImport("useCustomer", () => () => ({
  customer: ref(null),
  refresh: vi.fn().mockResolvedValue(undefined),
  logout: vi.fn(),
}))

const mountError = (error: object) => mountSuspended(ErrorPage, { props: { error } })

describe("error page", () => {
  it("shows the not found copy and the categories for a 404", async () => {
    const wrapper = await mountError({ statusCode: 404, statusMessage: "Page not found: /x" })
    expect(wrapper.get("h1").text()).toBe("This page is not here")
    expect(wrapper.text()).toContain("We cannot find this page.")
    expect(wrapper.text()).toContain("Or start with a category")
    expect(wrapper.find("a[href='/categories/clothing']").exists()).toBe(true)
    expect(wrapper.text()).not.toContain("404")
    expect(wrapper.text()).not.toContain("Page not found")
  })

  it("shows the text of the message key in place of the body", async () => {
    const wrapper = await mountError({
      statusCode: 404,
      data: { messageKey: "categories.notFound" },
    })
    expect(wrapper.text()).toContain("The category does not exist.")
    expect(wrapper.text()).not.toContain("We cannot find this page.")
  })

  it("shows the server copy with no categories for a 500", async () => {
    const wrapper = await mountError({ statusCode: 500, statusMessage: "Internal" })
    expect(wrapper.get("h1").text()).toBe("Something went wrong")
    expect(wrapper.text()).not.toContain("Or start with a category")
    expect(wrapper.text()).not.toContain("500")
  })
})
