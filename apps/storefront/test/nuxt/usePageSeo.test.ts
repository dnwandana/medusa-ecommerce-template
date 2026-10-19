import { mountSuspended } from "@nuxt/test-utils/runtime"
import { afterEach, describe, expect, it } from "vitest"
import type { PageSeoInput } from "~/composables/usePageSeo"
import { readHead } from "./helpers/head"

// A small component stands in for a page that calls the composable.
const mountWith = (route: string, input: PageSeoInput | null) =>
  mountSuspended(
    defineComponent({
      setup() {
        usePageSeo(() => input)
        return () => h("div")
      },
    }),
    { route }
  )

afterEach(async () => {
  await useNuxtApp().$i18n.setLocale("en")
})

describe("usePageSeo", () => {
  it("writes the full head for an English page", async () => {
    await mountWith("/returns", { title: "Returns", description: "If a piece does not fit." })
    const head = await readHead()
    expect(head.title).toBe("Returns | Everyday")
    expect(head.meta("description")).toBe("If a piece does not fit.")
    expect(head.meta("og:title")).toBe("Returns | Everyday")
    expect(head.meta("og:description")).toBe("If a piece does not fit.")
    expect(head.meta("og:type")).toBe("website")
    expect(head.meta("og:site_name")).toBe("Everyday")
    expect(head.meta("og:url")).toBe("http://localhost:3000/returns")
    expect(head.meta("og:image")).toBe("http://localhost:3000/og-default.jpg")
    expect(head.meta("og:image:width")).toBe("1200")
    expect(head.meta("og:image:height")).toBe("630")
    expect(head.meta("og:image:alt")).toBe("Everyday")
    expect(head.meta("og:locale")).toBe("en_US")
    expect(head.meta("og:locale:alternate")).toBe("id_ID")
    expect(head.meta("twitter:card")).toBe("summary_large_image")
    expect(head.links("canonical")).toEqual([{ href: "http://localhost:3000/returns" }])
    expect(head.links("alternate")).toEqual(
      expect.arrayContaining([
        { href: "http://localhost:3000/returns", hreflang: "x-default" },
        { href: "http://localhost:3000/returns", hreflang: "en-US" },
        { href: "http://localhost:3000/id/returns", hreflang: "id-ID" },
      ])
    )
  })

  it("writes only the hreflang values of the spec", async () => {
    await mountWith("/returns", { title: "Returns", description: "x" })
    const hreflangs = (await readHead()).links("alternate").map((link) => link.hreflang)
    expect(hreflangs.sort()).toEqual(["en-US", "id-ID", "x-default"])
  })

  it("writes the Indonesian locale tags on an /id page", async () => {
    await mountWith("/id/returns", { title: "Pengembalian", description: "x" })
    const head = await readHead()
    expect(head.links("canonical")).toEqual([{ href: "http://localhost:3000/id/returns" }])
    expect(head.meta("og:url")).toBe("http://localhost:3000/id/returns")
    expect(head.meta("og:locale")).toBe("id_ID")
    expect(head.meta("og:locale:alternate")).toBe("en_US")
  })

  it("keeps only page in the canonical URL", async () => {
    await mountWith("/id/products?page=2&sort=price-asc&colour=white", {
      title: "Produk",
      description: "x",
    })
    expect((await readHead()).links("canonical")).toEqual([
      { href: "http://localhost:3000/id/products?page=2" },
    ])
  })

  it("uses the home title and a product type and image", async () => {
    await mountWith("/", {
      title: "Clothes for the days you actually have.",
      description: "x",
      home: true,
      type: "product",
      image: { url: "https://cdn.example/a.png", alt: "A" },
    })
    const head = await readHead()
    expect(head.title).toBe("Everyday – Clothes for the days you actually have.")
    expect(head.meta("og:type")).toBe("product")
    expect(head.meta("og:image")).toBe("https://cdn.example/a.png")
    expect(head.meta("og:image:alt")).toBe("A")
    expect(head.meta("og:image:width")).toBeNull()
  })

  it("makes a relative image URL absolute and cuts a long description", async () => {
    const description = `${"word ".repeat(40)}end`
    await mountWith("/returns", {
      title: "Returns",
      description,
      image: { url: "/images/a.jpg", width: 800, height: 600, alt: "A" },
    })
    const head = await readHead()
    expect(head.meta("og:image")).toBe("http://localhost:3000/images/a.jpg")
    expect(head.meta("og:image:width")).toBe("800")
    expect(head.meta("description")!.length).toBeLessThanOrEqual(160)
    expect(head.meta("description")!.endsWith("…")).toBe(true)
    expect(head.meta("og:description")).toBe(head.meta("description"))
  })

  it("writes one script for each JSON-LD entry and skips null", async () => {
    await mountWith("/", { title: "T", description: "x", jsonLd: [{ "@type": "WebSite" }, null] })
    expect((await readHead()).jsonLd()).toEqual([{ "@type": "WebSite" }])
  })

  it("writes nothing while the input is null", async () => {
    await mountWith("/returns", null)
    const head = await readHead()
    expect(head.links("canonical")).toEqual([])
    expect(head.meta("og:title")).toBeNull()
    expect(head.jsonLd()).toEqual([])
  })

  it("updates the head when the input changes", async () => {
    const input = ref<PageSeoInput | null>(null)
    await mountSuspended(
      defineComponent({
        setup() {
          usePageSeo(input)
          return () => h("div")
        },
      }),
      { route: "/returns" }
    )
    expect((await readHead()).meta("og:title")).toBeNull()
    input.value = { title: "Returns", description: "x" }
    expect((await readHead()).meta("og:title")).toBe("Returns | Everyday")
  })
})

describe("useSiteUrl", () => {
  it("returns the site URL with no trailing slash", () => {
    const config = useRuntimeConfig()
    const original = config.public.siteUrl
    config.public.siteUrl = "https://shop.example/"
    try {
      expect(useNuxtApp().runWithContext(() => useSiteUrl())).toBe("https://shop.example")
    } finally {
      config.public.siteUrl = original
    }
  })
})
