import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { createMedusaClient, toMedusaLocale } from "../../app/utils/medusaClient"

describe("toMedusaLocale", () => {
  it("maps the storefront locale to a Medusa locale", () => {
    expect(toMedusaLocale("en")).toBe("en-US")
    expect(toMedusaLocale("id")).toBe("id-ID")
  })

  it("uses English for an unknown locale", () => {
    expect(toMedusaLocale("fr")).toBe("en-US")
    expect(toMedusaLocale("")).toBe("en-US")
  })
})

describe("createMedusaClient", () => {
  const fetchMock = vi.fn()
  const originalFetch = global.fetch

  beforeEach(() => {
    fetchMock.mockReset()
    fetchMock.mockResolvedValue(
      new Response(JSON.stringify({ products: [] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      })
    )
    global.fetch = fetchMock as unknown as typeof fetch
  })

  afterEach(() => {
    global.fetch = originalFetch
  })

  // Returns the URL, the headers, and the options of the first request.
  const firstRequest = () => {
    const [input, init] = fetchMock.mock.calls[0]
    return { url: String(input), headers: new Headers(init.headers), init }
  }

  it("sends the request to the base URL with the publishable key", async () => {
    const sdk = createMedusaClient({
      baseUrl: "http://medusa.test:9000",
      publishableKey: "pk_test",
      locale: "en",
    })

    await sdk.client.fetch("/store/products")

    const { url, headers } = firstRequest()
    expect(url).toBe("http://medusa.test:9000/store/products")
    expect(headers.get("x-publishable-api-key")).toBe("pk_test")
  })

  it("sends the active locale with each request", async () => {
    const sdk = createMedusaClient({
      baseUrl: "http://medusa.test:9000",
      publishableKey: "pk_test",
      locale: "id",
    })

    await sdk.client.fetch("/store/products")

    expect(firstRequest().headers.get("x-medusa-locale")).toBe("id-ID")
  })

  it("uses the cookie session and sends no token header", async () => {
    const sdk = createMedusaClient({
      baseUrl: "http://medusa.test:9000",
      publishableKey: "pk_test",
      locale: "en",
    })

    await sdk.client.fetch("/store/customers/me")

    const { headers, init } = firstRequest()
    expect(init.credentials).toBe("include")
    expect(headers.get("authorization")).toBeNull()
  })
})
