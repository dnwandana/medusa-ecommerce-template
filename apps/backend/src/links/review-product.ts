import { defineLink } from "@medusajs/framework/utils"
import ProductModule from "@medusajs/medusa/product"
import ProductReviewModule from "../modules/product-review"

// Read-only link. The column product_id of the review holds the product id.
export default defineLink(
  {
    linkable: ProductReviewModule.linkable.review,
    field: "product_id",
    isList: false,
  },
  ProductModule.linkable.product,
  { readOnly: true }
)
