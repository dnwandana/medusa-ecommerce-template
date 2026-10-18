import { mountSuspended } from "@nuxt/test-utils/runtime"
import { describe, expect, it } from "vitest"
import { CategoryFilter } from "#components"

const LINKS = [
  { id: "pcat_w", name: "All", to: "/categories/women", current: true },
  { id: "pcat_1", name: "Shirts", to: "/categories/shirts", current: false },
  { id: "pcat_2", name: "Trousers", to: "/categories/trousers", current: false },
]

describe("CategoryFilter", () => {
  it("marks the current link and draws text links, not buttons", async () => {
    const wrapper = await mountSuspended(CategoryFilter, { props: { links: LINKS } })
    const current = wrapper.find("a[aria-current='page']")

    expect(current.text()).toBe("All")
    expect(current.classes()).toContain("caps")
    expect(wrapper.find("[data-slot='button']").exists()).toBe(false)
    expect(wrapper.find("a[href='/categories/shirts']").attributes("aria-current")).toBeUndefined()
  })

  it("names the nav and scrolls to the side below md", async () => {
    const wrapper = await mountSuspended(CategoryFilter, { props: { links: LINKS } })
    const nav = wrapper.get("nav")

    expect(nav.attributes("aria-label")).toBe("Categories")
    expect(nav.classes()).toEqual(expect.arrayContaining(["overflow-x-auto", "md:flex-wrap"]))
  })

  it("renders nothing with one link", async () => {
    const wrapper = await mountSuspended(CategoryFilter, { props: { links: LINKS.slice(0, 1) } })
    expect(wrapper.find("nav").exists()).toBe(false)
  })
})
