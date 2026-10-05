import { model } from "@medusajs/framework/utils"

const Review = model
  .define("review", {
    id: model.id().primaryKey(),
    product_id: model.text().index("IDX_REVIEW_PRODUCT_ID"),
    customer_id: model.text(),
    // The purchased item. One review for each purchase.
    order_line_item_id: model.text(),
    rating: model.number(),
    title: model.text().nullable(),
    content: model.text(),
    first_name: model.text(),
    last_name: model.text(),
    status: model.enum(["pending", "approved", "rejected"]).default("pending"),
  })
  .indexes([{ on: ["order_line_item_id"], unique: true }])
  .checks([
    {
      name: "rating_range",
      expression: (columns) => `${columns.rating} >= 1 AND ${columns.rating} <= 5`,
    },
  ])

export default Review
