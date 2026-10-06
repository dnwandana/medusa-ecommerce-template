import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ReviewList, StarRating } from "#components"
import { clearNuxtData } from "#imports"

const { reviews } = vi.hoisted(() => ({ reviews: { listForProduct: vi.fn() } }))

mockNuxtImport("useReviews", () => () => reviews)

const review = (id: string, rating: number) => ({
  id,
  product_id: "prod_1",
  rating,
  title: `Title ${id}`,
  content: `Content ${id}`,
  first_name: "Sari",
  last_name: "Dewi",
  created_at: "2026-10-01T08:00:00.000Z",
})

beforeEach(() => {
  clearNuxtData()
  reviews.listForProduct.mockReset()
})

describe("StarRating", () => {
  it("fills the stars for the rounded rating and has a label", async () => {
    const wrapper = await mountSuspended(StarRating, { props: { rating: 3.6 } })

    expect(wrapper.findAll('[data-filled="true"]')).toHaveLength(4)
    expect(wrapper.findAll('[data-filled="false"]')).toHaveLength(1)
    expect(wrapper.attributes("aria-label")).toBe("3.6 out of 5")
  })
})

describe("ReviewList", () => {
  it("shows the average, the count, and each review", async () => {
    reviews.listForProduct.mockResolvedValue({
      reviews: [review("rev_1", 5), review("rev_2", 4)],
      count: 2,
      limit: 5,
      offset: 0,
      average_rating: 4.5,
    })

    const wrapper = await mountSuspended(ReviewList, { props: { productId: "prod_1" } })

    expect(reviews.listForProduct).toHaveBeenCalledWith("prod_1", { limit: 5, offset: 0 })
    expect(wrapper.text()).toContain("4.5 out of 5")
    expect(wrapper.text()).toContain("2 reviews")
    expect(wrapper.text()).toContain("Title rev_1")
    expect(wrapper.text()).toContain("Content rev_2")
    expect(wrapper.text()).toContain("Sari")
    expect(wrapper.text()).not.toContain("Dewi")
  })

  it("shows the empty text and no average when there are no reviews", async () => {
    reviews.listForProduct.mockResolvedValue({
      reviews: [],
      count: 0,
      limit: 5,
      offset: 0,
      average_rating: null,
    })

    const wrapper = await mountSuspended(ReviewList, { props: { productId: "prod_1" } })

    expect(wrapper.text()).toContain("This product has no reviews yet.")
    expect(wrapper.text()).not.toContain("out of 5")
    expect(wrapper.find("button").exists()).toBe(false)
  })

  it("loads the next page", async () => {
    reviews.listForProduct.mockResolvedValue({
      reviews: [review("rev_1", 5)],
      count: 7,
      limit: 5,
      offset: 0,
      average_rating: 5,
    })
    const wrapper = await mountSuspended(ReviewList, { props: { productId: "prod_1" } })

    const next = wrapper.findAll("button").find((button) => button.text() === "Next")
    await next!.trigger("click")
    await flushPromises()

    expect(reviews.listForProduct).toHaveBeenLastCalledWith("prod_1", { limit: 5, offset: 5 })
  })

  it("shows the initials of the reviewer in an avatar", async () => {
    reviews.listForProduct.mockResolvedValue({
      reviews: [review("rev_1", 5)], count: 1, limit: 5, offset: 0, average_rating: 5,
    })
    const wrapper = await mountSuspended(ReviewList, { props: { productId: "prod_1" } })

    expect(wrapper.find('[data-slot="avatar-fallback"]').text()).toBe("SD")
    expect(wrapper.find("article").text()).toContain("2026-10-01")
  })

  it("shows a destructive alert when the reviews do not load", async () => {
    reviews.listForProduct.mockRejectedValue(new Error("HTTP 500"))
    const wrapper = await mountSuspended(ReviewList, { props: { productId: "prod_1" } })

    expect(wrapper.find('[role="alert"]').text()).toBe("An error occurred. Try again.")
  })

  it("shows Previous on page 2", async () => {
    reviews.listForProduct.mockResolvedValue({
      reviews: [review("rev_1", 5)], count: 7, limit: 5, offset: 0, average_rating: 5,
    })
    const wrapper = await mountSuspended(ReviewList, { props: { productId: "prod_1" } })

    await wrapper.findAll("button").find((button) => button.text() === "Next")!.trigger("click")
    await flushPromises()

    expect(wrapper.findAll("button").map((button) => button.text())).toContain("Previous")
  })
})
