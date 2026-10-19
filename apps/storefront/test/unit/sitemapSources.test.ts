import { afterEach, describe, expect, it, vi } from "vitest"
import {
  loadSitemapSources,
  sitemapResponse,
  type FetchStore,
} from "../../server/utils/sitemapSources"

// A fake Store API that returns `limit` items from `offset`, with the total count.
function fakeStore(products: object[], categories: object[]) {
  const calls: { path: string; query: Record<string, string | number> }[] = []
  const fetchStore: FetchStore = async (path, query) => {
    calls.push({ path, query })
    const list = path === "/store/products" ? products : categories
    const offset = Number(query.offset)
    const items = list.slice(offset, offset + Number(query.limit))
    const key = path === "/store/products" ? "products" : "product_categories"
    return { [key]: items, count: list.length } as never
  }
  return { fetchStore, calls }
}

afterEach(() => {
  vi.restoreAllMocks()
})

describe("loadSitemapSources", () => {
  it("reads all pages of products and categories", async () => {
    const { fetchStore, calls } = fakeStore(
      [
        { handle: "a", updated_at: "2026-10-01", thumbnail: "/t.png", images: [] },
        {
          handle: "b",
          updated_at: "2026-10-02",
          thumbnail: null,
          images: [
            { url: "/b2.png", rank: 1 },
            { url: "/b1.png", rank: 0 },
          ],
        },
        { handle: "c", updated_at: null, thumbnail: null, images: [] },
      ],
      [{ handle: "apparel", updated_at: "2026-10-03" }]
    )
    const sources = await loadSitemapSources(fetchStore, 2)
    expect(sources.products).toEqual([
      { handle: "a", updated_at: "2026-10-01", images: ["/t.png"] },
      { handle: "b", updated_at: "2026-10-02", images: ["/b1.png", "/b2.png"] },
      { handle: "c", updated_at: null, images: [] },
    ])
    expect(sources.categories).toEqual([{ handle: "apparel", updated_at: "2026-10-03" }])
    expect(calls.filter((c) => c.path === "/store/products").map((c) => c.query.offset)).toEqual([
      0, 2,
    ])
    expect(calls[0]!.query.fields).toBe("handle,updated_at,thumbnail,*images")
    expect(calls.find((c) => c.path === "/store/product-categories")!.query.fields).toBe(
      "handle,updated_at"
    )
  })

  it("uses a page size of 100 by default", async () => {
    const { fetchStore, calls } = fakeStore([], [])
    await loadSitemapSources(fetchStore)
    expect(calls.map((c) => c.query.limit)).toEqual([100, 100])
  })

  // Review Focus: a page with no items while count says more.
  it("stops when a page has no items", async () => {
    const fetchStore: FetchStore = async (path) =>
      ({
        [path === "/store/products" ? "products" : "product_categories"]: [],
        count: 50,
      }) as never
    await expect(loadSitemapSources(fetchStore, 2)).resolves.toEqual({
      products: [],
      categories: [],
    })
  })
})

describe("sitemapResponse", () => {
  it("returns status 503 when the backend fails", async () => {
    const log = vi.spyOn(console, "error").mockImplementation(() => {})
    await expect(
      sitemapResponse(() => Promise.reject(new Error("down")), "https://shop.example")
    ).rejects.toMatchObject({ statusCode: 503 })
    expect(log).toHaveBeenCalledOnce()
  })

  it("returns the XML of the sources", async () => {
    const xml = await sitemapResponse(
      async () => ({ products: [], categories: [] }),
      "https://shop.example"
    )
    expect(xml).toContain("<loc>https://shop.example/</loc>")
  })
})
