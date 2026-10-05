export type ReviewStatus = "pending" | "approved" | "rejected"

export type AdminReview = {
  id: string
  product_id: string
  rating: number
  title: string | null
  content: string
  first_name: string
  last_name: string
  status: ReviewStatus
  created_at: string
  product?: { id: string; title: string } | null
}

export const PAGE_SIZE = 20

const STATUS_COLORS: Record<ReviewStatus, "green" | "red" | "orange"> = {
  approved: "green",
  rejected: "red",
  pending: "orange",
}

/** Returns the color of the status badge for a review status. */
export function statusColor(status: ReviewStatus): "green" | "red" | "orange" {
  return STATUS_COLORS[status]
}

/** Returns the full name of the author, or a dash if the review has no names. */
export function authorName(review: Pick<AdminReview, "first_name" | "last_name">): string {
  const name = `${review.first_name ?? ""} ${review.last_name ?? ""}`.trim()
  return name || "-"
}

/** Returns the query of GET /admin/reviews for a page index and a status filter. */
export function listQuery(
  pageIndex: number,
  status: ReviewStatus | "all"
): { limit: number; offset: number; status?: ReviewStatus } {
  const query: { limit: number; offset: number; status?: ReviewStatus } = {
    limit: PAGE_SIZE,
    offset: pageIndex * PAGE_SIZE,
  }
  if (status !== "all") {
    query.status = status
  }
  return query
}
