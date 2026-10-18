import { describe, expect, it } from "vitest"
import { childCategoryLinks, descendantCategoryIds, topCategoryLinks } from "~/utils/categoryLinks"

describe("childCategoryLinks", () => {
  it("links All and the children in rank order", () => {
    const category = {
      id: "pcat_w",
      name: "Women",
      handle: "women",
      category_children: [
        { id: "pcat_2", name: "Trousers", handle: "trousers", rank: 1 },
        { id: "pcat_1", name: "Shirts", handle: "shirts", rank: 0 },
      ],
    } as never
    expect(childCategoryLinks(category, "All")).toEqual([
      { id: "pcat_w", name: "All", to: "/categories/women", current: true },
      { id: "pcat_1", name: "Shirts", to: "/categories/shirts", current: false },
      { id: "pcat_2", name: "Trousers", to: "/categories/trousers", current: false },
    ])
    expect(
      childCategoryLinks({ ...(category as object), category_children: [] } as never, "All")
    ).toEqual([])
  })

  it("returns no link when the category has no children field", () => {
    expect(
      childCategoryLinks({ id: "pcat_w", name: "Women", handle: "women" } as never, "All")
    ).toEqual([])
  })
})

describe("topCategoryLinks", () => {
  it("links All products and the top-level categories", () => {
    const links = topCategoryLinks(
      [
        { id: "pcat_w", name: "Women", handle: "women", parent_category_id: null },
        { id: "pcat_1", name: "Shirts", handle: "shirts", parent_category_id: "pcat_w" },
      ] as never,
      "All"
    )
    expect(links.map((link) => link.to)).toEqual(["/products", "/categories/women"])
    expect(links[0]).toEqual({ id: "all", name: "All", to: "/products", current: true })
    expect(links[1]?.current).toBe(false)
  })
})

describe("descendantCategoryIds", () => {
  it("returns the ids of the children and of their children", () => {
    const category = {
      id: "pcat_c",
      category_children: [
        { id: "pcat_1", category_children: [{ id: "pcat_3", category_children: [] }] },
        { id: "pcat_2" },
      ],
    } as never
    expect(descendantCategoryIds(category)).toEqual(["pcat_1", "pcat_3", "pcat_2"])
  })

  it("returns no id for a category with no children", () => {
    expect(descendantCategoryIds({ id: "pcat_c" } as never)).toEqual([])
  })
})
