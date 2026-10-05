import type { ReviewInput } from "~/utils/reviewForm"

export type Review = {
  id: string
  product_id: string
  rating: number
  title: string | null
  content: string
  first_name: string | null
  last_name: string | null
  created_at: string
}

export type ReviewPage = {
  reviews: Review[]
  count: number
  limit: number
  offset: number
  average_rating: number | null
}

export type ReviewableItem = {
  order_id: string
  order_display_id: number
  order_line_item_id: string
  product_id: string
  product_title: string
  variant_title: string | null
  thumbnail: string | null
}

export const REVIEW_PAGE_SIZE = 5

// Returns the functions for the review routes of the backend.
export function useReviews(): {
  listForProduct(
    productId: string,
    options?: { limit?: number; offset?: number }
  ): Promise<ReviewPage>
  listReviewableItems(): Promise<ReviewableItem[]>
  submit(input: ReviewInput): Promise<void>
} {
  const sdk = useMedusa()

  return {
    listForProduct(productId, options = {}) {
      return sdk.client.fetch<ReviewPage>(`/store/products/${productId}/reviews`, {
        query: {
          limit: options.limit ?? REVIEW_PAGE_SIZE,
          offset: options.offset ?? 0,
        },
      })
    },

    async listReviewableItems() {
      const { items } = await sdk.client.fetch<{ items: ReviewableItem[] }>(
        "/store/customers/me/reviewable-items"
      )
      return items
    },

    // Does not catch the error. The review form maps it with reviewErrorKey.
    async submit(input) {
      await sdk.client.fetch("/store/reviews", { method: "POST", body: input })
    },
  }
}
