import { describe, expect, it } from "vitest"
import { reviewErrorKey, validateReviewInput } from "../../app/utils/reviewForm"

const httpError = (status: number) => Object.assign(new Error(`HTTP ${status}`), { status })

describe("validateReviewInput", () => {
  it("accepts a rating from 1 to 5 with a text", () => {
    expect(validateReviewInput({ rating: 1, content: "Good." })).toEqual({})
    expect(validateReviewInput({ rating: 5, content: "Very good." })).toEqual({})
  })

  it("rejects a rating that is not an integer from 1 to 5", () => {
    for (const rating of [0, 6, 2.5, Number.NaN]) {
      expect(validateReviewInput({ rating, content: "Text" })).toEqual({
        rating: "reviews.errors.rating",
      })
    }
  })

  it("rejects a text that is empty or has only spaces", () => {
    expect(validateReviewInput({ rating: 4, content: "   " })).toEqual({
      content: "reviews.errors.content",
    })
  })

  it("reports the two errors together", () => {
    expect(validateReviewInput({ rating: 0, content: "" })).toEqual({
      rating: "reviews.errors.rating",
      content: "reviews.errors.content",
    })
  })
})

describe("reviewErrorKey", () => {
  it("maps each status of the review route to a message key", () => {
    expect(reviewErrorKey(httpError(422))).toBe("reviews.errors.duplicate")
    expect(reviewErrorKey(httpError(404))).toBe("reviews.errors.notFound")
    expect(reviewErrorKey(httpError(400))).toBe("reviews.errors.notAllowed")
  })

  it("uses the general message for all other errors", () => {
    expect(reviewErrorKey(httpError(500))).toBe("reviews.errors.generic")
    expect(reviewErrorKey(new Error("Network failure"))).toBe("reviews.errors.generic")
    expect(reviewErrorKey(null)).toBe("reviews.errors.generic")
  })
})
