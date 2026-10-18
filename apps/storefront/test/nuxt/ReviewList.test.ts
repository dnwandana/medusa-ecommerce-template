import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ReviewList } from "#components"
import { clearNuxtData } from "#imports"

const { reviews, toast } = vi.hoisted(() => ({
  reviews: { listForProduct: vi.fn() },
  toast: { success: vi.fn(), error: vi.fn() },
}))

vi.mock("vue-sonner", () => ({ toast }))
mockNuxtImport("useReviews", () => () => reviews)

const review = (id: string, rating: number) => ({
  id,
  product_id: "prod_1",
  rating,
  title: `Title ${id}`,
  content: `Content ${id}`,
  first_name: "Sari",
  last_name: "Dewi",
  size: "M" as string | null,
  created_at: "2026-10-01T08:00:00.000Z",
})

const page = (list: ReturnType<typeof review>[], count: number, average: number | null) => ({
  reviews: list,
  count,
  limit: list.length,
  offset: 0,
  average_rating: average,
})

const threeReviews = [1, 2, 3].map((n) => review(`rev_${n}`, 5))
const fiveReviews = [4, 5, 6, 7, 8].map((n) => review(`rev_${n}`, 4))

const mountReviews = async () => {
  const wrapper = await mountSuspended(ReviewList, { props: { productId: "prod_1" } })
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  clearNuxtData()
  reviews.listForProduct.mockReset()
  toast.error.mockReset()
})

afterEach(() => {
  vi.useRealTimers()
})

describe("ReviewList", () => {
  it("has the id that the rating link goes to", async () => {
    reviews.listForProduct.mockResolvedValue(page(threeReviews, 3, 5))
    const wrapper = await mountReviews()
    expect(wrapper.get("section").attributes("id")).toBe("reviews")
  })

  it("shows the average, the count, and each review", async () => {
    reviews.listForProduct.mockResolvedValue(page([review("rev_1", 5), review("rev_2", 4)], 2, 4.5))

    const wrapper = await mountReviews()

    expect(wrapper.text()).toContain("4.5")
    expect(wrapper.text()).toContain("Based on 2 reviews")
    expect(wrapper.text()).toContain("Title rev_1")
    expect(wrapper.text()).toContain("Content rev_2")
    expect(wrapper.findAll("article h3").map((title) => title.text())).toEqual([
      "Title rev_1",
      "Title rev_2",
    ])
  })

  it("shows the summary and the byline with the size", async () => {
    reviews.listForProduct.mockResolvedValue(
      page([review("rev_1", 5), { ...review("rev_2", 4), size: null }], 13, 4.8)
    )
    const wrapper = await mountReviews()

    expect(reviews.listForProduct).toHaveBeenCalledWith("prod_1", { limit: 3, offset: 0 })
    expect(wrapper.text()).toContain("4.8")
    expect(wrapper.text()).toContain("Based on 13 reviews")
    const bylines = wrapper.findAll("[data-testid='review-byline']").map((line) => line.text())
    expect(bylines).toEqual(["Sari · Size M", "Sari"])
    expect(wrapper.text()).not.toContain("Dewi")
    expect(wrapper.find("[data-slot='avatar']").exists()).toBe(false)
  })

  it("adds 5 more reviews for each click and ignores a second click", async () => {
    reviews.listForProduct.mockResolvedValueOnce(page(threeReviews, 13, 4.8))
    const wrapper = await mountReviews()
    let resolve!: (value: unknown) => void
    reviews.listForProduct.mockReturnValueOnce(new Promise((done) => (resolve = done)))

    const more = wrapper.findAll("button").find((button) => button.text() === "Show more reviews")!
    await more.trigger("click")
    await more.trigger("click")
    resolve(page(fiveReviews, 13, 4.8))
    await flushPromises()

    expect(reviews.listForProduct).toHaveBeenCalledTimes(2)
    expect(reviews.listForProduct).toHaveBeenLastCalledWith("prod_1", { limit: 5, offset: 3 })
    expect(wrapper.findAll("article")).toHaveLength(8)
  })

  it("keeps the list and shows a toast when more reviews do not load", async () => {
    reviews.listForProduct.mockResolvedValueOnce(page(threeReviews, 13, 4.8))
    const wrapper = await mountReviews()
    reviews.listForProduct.mockRejectedValueOnce(new Error("HTTP 500"))

    await wrapper
      .findAll("button")
      .find((button) => button.text() === "Show more reviews")!
      .trigger("click")
    await flushPromises()

    expect(toast.error).toHaveBeenCalledWith("An error occurred. Try again.")
    expect(wrapper.findAll("article")).toHaveLength(3)
  })

  it("shows no Show more button when the list has all the reviews", async () => {
    reviews.listForProduct.mockResolvedValue(page(threeReviews, 3, 4))
    const wrapper = await mountReviews()
    expect(wrapper.text()).not.toContain("Show more reviews")
  })

  it("shows the date as a relative time", async () => {
    vi.useFakeTimers({ toFake: ["Date"] })
    vi.setSystemTime(new Date("2026-10-15T08:00:00Z"))
    reviews.listForProduct.mockResolvedValue(page([review("rev_1", 5)], 1, 5))
    const wrapper = await mountReviews()
    expect(wrapper.get("article time").attributes("datetime")).toBe("2026-10-01T08:00:00.000Z")
    expect(wrapper.get("article time").text()).toBe("2 weeks ago")
  })

  it("shows the empty text and no average when there are no reviews", async () => {
    reviews.listForProduct.mockResolvedValue(page([], 0, null))

    const wrapper = await mountReviews()

    expect(wrapper.text()).toContain("This product has no reviews yet.")
    expect(wrapper.text()).not.toContain("Based on")
    expect(wrapper.find("button").exists()).toBe(false)
  })

  it("shows skeletons while the reviews load", async () => {
    reviews.listForProduct.mockReturnValue(new Promise(() => {}))
    const wrapper = await mountReviews()
    expect(wrapper.findAll("[data-testid='review-skeleton']")).toHaveLength(3)
  })

  it("shows a destructive alert when the reviews do not load", async () => {
    reviews.listForProduct.mockRejectedValue(new Error("HTTP 500"))
    const wrapper = await mountReviews()

    expect(wrapper.find('[role="alert"]').text()).toBe("An error occurred. Try again.")
  })
})
