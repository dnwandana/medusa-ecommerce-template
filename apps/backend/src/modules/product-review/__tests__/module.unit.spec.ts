import ProductReviewModule, { PRODUCT_REVIEW_MODULE } from ".."
import ProductReviewModuleService from "../service"

describe("product-review module", () => {
  it("has the container name productReview", () => {
    expect(PRODUCT_REVIEW_MODULE).toBe("productReview")
  })

  it("exposes the review as a linkable", () => {
    expect(ProductReviewModule.linkable.review).toBeDefined()
  })

  it("has the generated methods for reviews", () => {
    for (const name of [
      "createReviews",
      "retrieveReview",
      "listReviews",
      "listAndCountReviews",
      "updateReviews",
      "deleteReviews",
    ]) {
      expect(typeof (ProductReviewModuleService.prototype as any)[name]).toBe("function")
    }
  })
})
