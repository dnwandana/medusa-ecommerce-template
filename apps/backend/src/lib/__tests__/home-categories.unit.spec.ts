import { buildHomeCategories, isHomeCategory } from "../home-categories"

const category = (id: string, rank: number, metadata: Record<string, unknown> | null) => ({
  id,
  name: id,
  handle: id,
  rank,
  metadata,
})

describe("isHomeCategory", () => {
  it("is true only for show_on_home true", () => {
    expect(isHomeCategory(category("a", 0, { show_on_home: true }))).toBe(true)
    expect(isHomeCategory(category("a", 0, { show_on_home: "true" }))).toBe(false)
    expect(isHomeCategory(category("a", 0, null))).toBe(false)
  })
})

describe("buildHomeCategories", () => {
  it("keeps the home categories in rank order", () => {
    const result = buildHomeCategories(
      [
        category("men", 1, { show_on_home: true }),
        category("sale", 2, null),
        category("women", 0, { show_on_home: true }),
      ],
      []
    )
    expect(result.map((c) => c.id)).toEqual(["women", "men"])
    expect(result[0].image).toBeNull()
    expect(result[0]).toEqual({ id: "women", name: "women", handle: "women", image: null })
  })

  it("uses the uploaded image before the newest product", () => {
    const products = [
      { thumbnail: "old.jpg", created_at: "2026-01-01", categories: [{ id: "women" }] },
      { thumbnail: "new.jpg", created_at: "2026-09-01", categories: [{ id: "women" }] },
      { thumbnail: null, created_at: "2026-10-01", categories: [{ id: "women" }] },
      { thumbnail: "men.jpg", created_at: "2026-10-05", categories: [{ id: "men" }] },
    ]
    expect(
      buildHomeCategories([category("women", 0, { show_on_home: true })], products)[0].image
    ).toBe("new.jpg")
    expect(
      buildHomeCategories(
        [category("women", 0, { show_on_home: true, tile_image_url: "tile.jpg" })],
        products
      )[0].image
    ).toBe("tile.jpg")
    expect(
      buildHomeCategories(
        [category("women", 0, { show_on_home: true, tile_image_url: "" })],
        products
      )[0].image
    ).toBe("new.jpg")
  })
})
