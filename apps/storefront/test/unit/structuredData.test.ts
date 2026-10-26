import { describe, expect, it } from "vitest"
import {
  breadcrumbJsonLd,
  jsonLdScript,
  onlineStoreJsonLd,
  websiteJsonLd,
} from "~/utils/structuredData"

describe("breadcrumbJsonLd", () => {
  it("numbers the breadcrumb items and leaves out the url of the last item", () => {
    expect(
      breadcrumbJsonLd([
        { name: "Home", url: "https://shop.example/" },
        { name: "Apparel", url: "https://shop.example/categories/apparel" },
        { name: "Plain T-Shirt", url: null },
      ])
    ).toEqual({
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: "https://shop.example/" },
        {
          "@type": "ListItem",
          position: 2,
          name: "Apparel",
          item: "https://shop.example/categories/apparel",
        },
        { "@type": "ListItem", position: 3, name: "Plain T-Shirt" },
      ],
    })
  })
})

describe("onlineStoreJsonLd", () => {
  it("builds the OnlineStore with the return link and no shipping or telephone", () => {
    const data = onlineStoreJsonLd({
      name: "Everyday",
      siteUrl: "https://shop.example",
      returnsUrl: "https://shop.example/id/returns",
      email: "hello@shop.example",
      telephone: null,
      address: null,
      sameAs: [],
    })
    expect(data).toEqual({
      "@context": "https://schema.org",
      "@type": "OnlineStore",
      name: "Everyday",
      url: "https://shop.example",
      logo: "https://shop.example/logo.png",
      email: "hello@shop.example",
      hasMerchantReturnPolicy: {
        "@type": "MerchantReturnPolicy",
        applicableCountry: "ID",
        merchantReturnLink: "https://shop.example/id/returns",
      },
    })
  })

  it("leaves out an empty email", () => {
    expect(
      onlineStoreJsonLd({
        name: "E",
        siteUrl: "https://s.example",
        returnsUrl: "https://s.example/returns",
        email: null,
        telephone: null,
        address: null,
        sameAs: [],
      })
    ).not.toHaveProperty("email")
  })

  it("adds the telephone, the address, and the social links", () => {
    const node = onlineStoreJsonLd({
      name: "Everyday",
      siteUrl: "https://shop.test",
      returnsUrl: "https://shop.test/returns",
      email: "a@shop.test",
      telephone: "+622155500100",
      address: "Jl. Sudirman 1\nJakarta",
      sameAs: ["https://instagram.com/store", "https://shopee.co.id/store"],
    })
    expect(node).toMatchObject({
      telephone: "+622155500100",
      address: "Jl. Sudirman 1\nJakarta",
      sameAs: ["https://instagram.com/store", "https://shopee.co.id/store"],
    })
  })

  it("leaves out each empty value", () => {
    const node = onlineStoreJsonLd({
      name: "E",
      siteUrl: "https://s.example",
      returnsUrl: "https://s.example/returns",
      email: "a@s.example",
      telephone: null,
      address: null,
      sameAs: [],
    })
    expect(node).not.toHaveProperty("telephone")
    expect(node).not.toHaveProperty("address")
    expect(node).not.toHaveProperty("sameAs")
  })

  it("gives one slash before the logo when the site URL ends with a slash", () => {
    const data = onlineStoreJsonLd({
      name: "E",
      siteUrl: "https://s.example/",
      returnsUrl: "https://s.example/returns",
      email: null,
      telephone: null,
      address: null,
      sameAs: [],
    })
    expect(data.logo).toBe("https://s.example/logo.png")
    expect(data.url).toBe("https://s.example")
  })
})

describe("websiteJsonLd", () => {
  it("builds the WebSite with no SearchAction", () => {
    expect(
      websiteJsonLd({ name: "Everyday", siteUrl: "https://shop.example", language: "id-ID" })
    ).toEqual({
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "Everyday",
      url: "https://shop.example",
      inLanguage: "id-ID",
    })
  })
})

describe("jsonLdScript", () => {
  // Review Focus: a text with "</script>" must not close the script tag.
  it("escapes the < character in the script text", () => {
    const script = jsonLdScript({ name: "Bad </script><script>alert(1)</script>" })
    expect(script.type).toBe("application/ld+json")
    expect(script.innerHTML).not.toContain("<")
    expect(script.innerHTML).toContain("\\u003c/script>")
    expect(JSON.parse(script.innerHTML)).toEqual({ name: "Bad </script><script>alert(1)</script>" })
  })
})
