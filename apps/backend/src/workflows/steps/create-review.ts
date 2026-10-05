import type { InferTypeOf } from "@medusajs/framework/types"
import { MedusaError } from "@medusajs/framework/utils"
import { createStep, StepResponse } from "@medusajs/framework/workflows-sdk"
import { PRODUCT_REVIEW_MODULE } from "../../modules/product-review"
import type Review from "../../modules/product-review/models/review"
import type ProductReviewModuleService from "../../modules/product-review/service"

export type CreateReviewStepInput = {
  product_id: string
  customer_id: string
  order_line_item_id: string
  rating: number
  title: string | null
  content: string
  first_name: string
  last_name: string
}

// Saves the review. The compensation function deletes it.
export const createReviewStep = createStep(
  "create-review",
  async (input: CreateReviewStepInput, { container }) => {
    const reviewService: ProductReviewModuleService = container.resolve(PRODUCT_REVIEW_MODULE)

    // The data model sets the status to "pending".
    let review: InferTypeOf<typeof Review>
    try {
      review = await reviewService.createReviews(input)
    } catch (error) {
      // Two requests for the same item can pass the validation at the same time. The unique
      // index then stops the second request. Report that as a duplicate review.
      const existing = await reviewService.listReviews({
        order_line_item_id: input.order_line_item_id,
      })
      if (existing.length > 0) {
        throw new MedusaError(MedusaError.Types.DUPLICATE_ERROR, "You already reviewed this item.")
      }
      throw error
    }

    return new StepResponse(review, review.id)
  },
  async (reviewId: string | undefined, { container }) => {
    if (!reviewId) {
      return
    }
    const reviewService: ProductReviewModuleService = container.resolve(PRODUCT_REVIEW_MODULE)
    await reviewService.deleteReviews(reviewId)
  }
)
