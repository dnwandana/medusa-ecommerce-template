import { InjectManager, MedusaContext, MedusaService } from "@medusajs/framework/utils"
import type { Context } from "@medusajs/framework/types"
import type { EntityManager } from "@medusajs/framework/mikro-orm/knex"
import Review from "./models/review"

class ProductReviewModuleService extends MedusaService({ Review }) {
  // Returns the average rating of the approved reviews of a product, with one decimal.
  // Returns 0 when the product has no approved review.
  @InjectManager()
  async getAverageRating(
    productId: string,
    @MedusaContext() sharedContext?: Context<EntityManager>
  ): Promise<number> {
    // The product id goes in as a parameter, so it cannot change the SQL text.
    const rows = await sharedContext?.manager?.execute(
      "SELECT AVG(rating) AS average FROM review WHERE product_id = ? AND status = 'approved' AND deleted_at IS NULL",
      [productId]
    )

    // PostgreSQL returns AVG as text, or null when no row matches.
    const average = rows?.[0]?.average
    if (average === null || average === undefined) {
      return 0
    }
    return Math.round(Number(average) * 10) / 10
  }
}

export default ProductReviewModuleService
