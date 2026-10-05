import { errorStatus } from "./errorStatus"

export type ReviewInput = {
  order_line_item_id: string
  rating: number
  title?: string
  content: string
}

// Returns a message key for each field that is not valid. An empty object means no error.
export function validateReviewInput(input: { rating: number; content: string }): {
  rating?: string
  content?: string
} {
  const errors: { rating?: string; content?: string } = {}

  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
    errors.rating = "reviews.errors.rating"
  }
  if (input.content.trim().length === 0) {
    errors.content = "reviews.errors.content"
  }

  return errors
}

const STATUS_KEYS: Record<number, string> = {
  422: "reviews.errors.duplicate",
  404: "reviews.errors.notFound",
  400: "reviews.errors.notAllowed",
}

// Returns the message key for an error of POST /store/reviews.
export function reviewErrorKey(error: unknown): string {
  const status = errorStatus(error)
  if (status !== undefined && STATUS_KEYS[status]) {
    return STATUS_KEYS[status]
  }

  return "reviews.errors.generic"
}
