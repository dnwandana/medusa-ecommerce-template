import { mockNuxtImport } from "@nuxt/test-utils/runtime"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useReviews } from "#imports"

const { sdk } = vi.hoisted(() => ({ sdk: { client: { fetch: vi.fn() } } }))

mockNuxtImport("useMedusa", () => () => sdk)

beforeEach(() => {
  sdk.client.fetch.mockReset()
})

describe("useReviews", () => {
  it("lists the reviews of a product with the default page size", async () => {
    const page = { reviews: [], count: 0, limit: 5, offset: 0, average_rating: null }
    sdk.client.fetch.mockResolvedValue(page)

    const result = await useReviews().listForProduct("prod_1")

    expect(sdk.client.fetch).toHaveBeenCalledWith("/store/products/prod_1/reviews", {
      query: { limit: 5, offset: 0 },
    })
    expect(result).toEqual(page)
  })

  it("passes the page to the review list", async () => {
    sdk.client.fetch.mockResolvedValue({ reviews: [], count: 12, limit: 5, offset: 10 })

    await useReviews().listForProduct("prod_1", { offset: 10 })

    expect(sdk.client.fetch).toHaveBeenCalledWith("/store/products/prod_1/reviews", {
      query: { limit: 5, offset: 10 },
    })
  })

  it("lists the items that the customer can review", async () => {
    sdk.client.fetch.mockResolvedValue({ items: [{ order_line_item_id: "ordli_1" }] })

    const items = await useReviews().listReviewableItems()

    expect(sdk.client.fetch).toHaveBeenCalledWith("/store/customers/me/reviewable-items")
    expect(items).toEqual([{ order_line_item_id: "ordli_1" }])
  })

  it("sends a review", async () => {
    sdk.client.fetch.mockResolvedValue({ review: { id: "rev_1" } })
    const input = { order_line_item_id: "ordli_1", rating: 5, title: "Good", content: "I like it." }

    await useReviews().submit(input)

    expect(sdk.client.fetch).toHaveBeenCalledWith("/store/reviews", {
      method: "POST",
      body: input,
    })
  })

  it("throws the error of the review route", async () => {
    sdk.client.fetch.mockRejectedValue(Object.assign(new Error("Duplicate"), { status: 422 }))

    await expect(
      useReviews().submit({ order_line_item_id: "ordli_1", rating: 5, content: "Text" })
    ).rejects.toMatchObject({ status: 422 })
  })
})
