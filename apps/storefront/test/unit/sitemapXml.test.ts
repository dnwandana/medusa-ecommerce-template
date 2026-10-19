import { describe, expect, it } from "vitest"
import { buildSitemapXml, STATIC_SITEMAP_PATHS } from "../../server/utils/sitemapXml"

const xml = buildSitemapXml({
  siteUrl: "https://shop.example/",
  products: [
    {
      handle: "plain-t-shirt",
      updated_at: "2026-10-12T08:30:00.000Z",
      images: ["https://cdn.example/a.png", "/b.png"],
    },
  ],
  categories: [{ handle: "apparel", updated_at: "2026-10-01T00:00:00.000Z" }],
})

const entryOf = (loc: string) =>
  xml.split("<url>").find((part) => part.includes(`<loc>${loc}</loc>`))

describe("buildSitemapXml", () => {
  it("declares the sitemap, xhtml, and image namespaces", () => {
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true)
    expect(xml).toContain('xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"')
    expect(xml).toContain('xmlns:xhtml="http://www.w3.org/1999/xhtml"')
    expect(xml).toContain('xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"')
  })

  it("lists each page in the two locales", () => {
    const locs = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
    expect(locs).toEqual(
      expect.arrayContaining([
        "https://shop.example/",
        "https://shop.example/id",
        "https://shop.example/returns",
        "https://shop.example/id/returns",
        "https://shop.example/products/plain-t-shirt",
        "https://shop.example/id/products/plain-t-shirt",
        "https://shop.example/categories/apparel",
        "https://shop.example/id/categories/apparel",
      ])
    )
    // The image locations also use <image:loc>, so this count has only the page locations.
    expect(locs).toHaveLength(2 * (STATIC_SITEMAP_PATHS.length + 1 + 1))
    expect(STATIC_SITEMAP_PATHS).toHaveLength(8)
  })

  it("gives each entry the alternates and x-default", () => {
    const entry = entryOf("https://shop.example/id/products/plain-t-shirt")!
    expect(entry).toContain(
      '<xhtml:link rel="alternate" hreflang="en-US" href="https://shop.example/products/plain-t-shirt"/>'
    )
    expect(entry).toContain(
      '<xhtml:link rel="alternate" hreflang="id-ID" href="https://shop.example/id/products/plain-t-shirt"/>'
    )
    expect(entry).toContain(
      '<xhtml:link rel="alternate" hreflang="x-default" href="https://shop.example/products/plain-t-shirt"/>'
    )
    expect(entry).toContain("<lastmod>2026-10-12</lastmod>")
    expect(entry).toContain(
      "<image:image><image:loc>https://cdn.example/a.png</image:loc></image:image>"
    )
    expect(entry).toContain("<image:loc>https://shop.example/b.png</image:loc>")
  })

  it("gives the home page alternates with no /id/ slash", () => {
    const entry = entryOf("https://shop.example/")!
    expect(entry).toContain(
      '<xhtml:link rel="alternate" hreflang="id-ID" href="https://shop.example/id"/>'
    )
  })

  it("has no lastmod for static pages and no priority or changefreq", () => {
    expect(entryOf("https://shop.example/")).not.toContain("<lastmod>")
    expect(xml).not.toMatch(/priority|changefreq/)
  })

  it("escapes the XML special characters", () => {
    const odd = buildSitemapXml({
      siteUrl: "https://shop.example",
      products: [{ handle: "a&b", updated_at: null, images: [] }],
      categories: [],
    })
    expect(odd).toContain("<loc>https://shop.example/products/a&amp;b</loc>")
  })
})
