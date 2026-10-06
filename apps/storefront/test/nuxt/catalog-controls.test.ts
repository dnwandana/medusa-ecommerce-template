import { mountSuspended } from "@nuxt/test-utils/runtime"
import { describe, expect, it } from "vitest"
import { CatalogPagination, CategoryFilter } from "#components"

const categories = [
  { id: "pcat_1", name: "Shirts", handle: "shirts" },
  { id: "pcat_2", name: "Trousers", handle: "trousers" },
] as never[]

describe("CategoryFilter", () => {
  it("marks All products as current when there is no handle", async () => {
    const wrapper = await mountSuspended(CategoryFilter, { props: { categories } })

    expect(wrapper.find('a[href="/products"]').attributes("aria-current")).toBe("page")
    expect(wrapper.find('a[href="/categories/shirts"]').attributes("aria-current")).toBeUndefined()
  })

  it("marks the current category", async () => {
    const wrapper = await mountSuspended(CategoryFilter, {
      props: { categories, currentHandle: "trousers" },
    })

    expect(wrapper.find('a[href="/categories/trousers"]').attributes("aria-current")).toBe("page")
    expect(wrapper.find('a[href="/products"]').attributes("aria-current")).toBeUndefined()
  })

  it("scrolls to the side below md and does not wrap", async () => {
    const wrapper = await mountSuspended(CategoryFilter, { props: { categories } })

    expect(wrapper.find("nav > div").classes()).toEqual(
      expect.arrayContaining(["flex", "overflow-x-auto", "md:flex-wrap"])
    )
  })
})

describe("CatalogPagination", () => {
  it("links each page with ?page=N and gives page 1 no query", async () => {
    const wrapper = await mountSuspended(CatalogPagination, {
      props: { page: 2, count: 30, path: "/products" },
    })
    const hrefs = wrapper.findAll("a").map((link) => link.attributes("href"))

    expect(hrefs).toEqual(
      expect.arrayContaining(["/products", "/products?page=2", "/products?page=3"])
    )
    expect(wrapper.find('a[href="/products?page=2"]').attributes("aria-current")).toBe("page")
  })

  it("names the pagination nav and the ellipsis from i18n", async () => {
    const wrapper = await mountSuspended(CatalogPagination, {
      props: { page: 1, count: 120, path: "/products" },
    })

    expect(wrapper.find("nav").attributes("aria-label")).toBe("Pages")
    expect(wrapper.find('[data-slot="pagination-ellipsis"]').text()).toBe("More pages")
  })

  it("links Previous and Next to the pages next to the current page", async () => {
    const wrapper = await mountSuspended(CatalogPagination, {
      props: { page: 2, count: 30, path: "/categories/shirts" },
    })
    const link = (text: string) => wrapper.findAll("a").find((item) => item.text().includes(text))

    expect(link("Previous")?.attributes("href")).toBe("/categories/shirts")
    expect(link("Next")?.attributes("href")).toBe("/categories/shirts?page=3")
  })

  it("shows no Previous link on page 1 and no Next link on the last page", async () => {
    const first = await mountSuspended(CatalogPagination, {
      props: { page: 1, count: 30, path: "/products" },
    })
    const last = await mountSuspended(CatalogPagination, {
      props: { page: 3, count: 30, path: "/products" },
    })

    expect(first.findAll("a").some((item) => item.text().includes("Previous"))).toBe(false)
    expect(last.findAll("a").some((item) => item.text().includes("Next"))).toBe(false)
  })

  it("renders nothing for one page of products", async () => {
    const wrapper = await mountSuspended(CatalogPagination, {
      props: { page: 1, count: 12, path: "/products" },
    })

    expect(wrapper.find("nav").exists()).toBe(false)
  })
})
