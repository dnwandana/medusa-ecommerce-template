import { MedusaError } from "@medusajs/framework/utils"
import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { PRODUCT_REVIEW_MODULE } from "../modules/product-review"
import type ProductReviewModuleService from "../modules/product-review/service"

export type UpdateReviewStatusInput = { ids: string[]; status: "approved" | "rejected" }

type PreviousStatus = { id: string; status: "pending" | "approved" | "rejected" }

// Sets the status of the reviews. The compensation function restores the previous statuses.
export const updateReviewStatusStep = createStep(
  "update-review-status",
  async (input: UpdateReviewStatusInput, { container }) => {
    const reviewService: ProductReviewModuleService = container.resolve(PRODUCT_REVIEW_MODULE)
    const ids = [...new Set(input.ids)]

    // Check all ids before the first update, so that one unknown id changes no review.
    const existing = await reviewService.listReviews({ id: ids })
    if (existing.length < ids.length) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, "One or more reviews were not found.")
    }

    const previous: PreviousStatus[] = existing.map((review) => ({
      id: review.id,
      status: review.status,
    }))

    const reviews = await reviewService.updateReviews(
      ids.map((id) => ({ id, status: input.status }))
    )

    return new StepResponse(reviews, previous)
  },
  async (previous: PreviousStatus[] | undefined, { container }) => {
    if (!previous?.length) {
      return
    }
    const reviewService: ProductReviewModuleService = container.resolve(PRODUCT_REVIEW_MODULE)
    await reviewService.updateReviews(previous)
  }
)

// Approves or rejects one or more reviews. Only an approved review shows on the storefront.
export const updateReviewStatusWorkflow = createWorkflow(
  "update-review-status",
  (input: UpdateReviewStatusInput) => {
    const reviews = updateReviewStatusStep(input)
    return new WorkflowResponse({ reviews })
  }
)
