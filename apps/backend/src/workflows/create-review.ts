import { createWorkflow, transform, WorkflowResponse } from "@medusajs/framework/workflows-sdk"
import { createReviewStep } from "./steps/create-review"
import { validateReviewItemStep } from "./steps/validate-review-item"

export type CreateReviewInput = {
  customer_id: string
  order_line_item_id: string
  rating: number
  title?: string | null
  content: string
}

// Creates a pending review for an item that the customer bought and that the store shipped.
// The product id and the names come from the database, not from the input.
export const createReviewWorkflow = createWorkflow("create-review", (input: CreateReviewInput) => {
  const item = validateReviewItemStep({
    customer_id: input.customer_id,
    order_line_item_id: input.order_line_item_id,
  })

  const data = transform({ input, item }, ({ input, item }) => ({
    product_id: item.product_id,
    customer_id: input.customer_id,
    order_line_item_id: input.order_line_item_id,
    rating: input.rating,
    title: input.title || null,
    content: input.content,
    first_name: item.first_name,
    last_name: item.last_name,
  }))

  const review = createReviewStep(data)

  return new WorkflowResponse({ review })
})
