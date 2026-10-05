import { MedusaError } from "@medusajs/framework/utils"
import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { WISHLIST_MODULE } from "../modules/wishlist"
import type WishlistModuleService from "../modules/wishlist/service"

export type RemoveWishlistItemInput = { customer_id: string; item_id: string }

// An unknown item and an item of a different customer get the same error, so that a customer
// cannot learn which item ids exist.
const notFound = (): MedusaError =>
  new MedusaError(MedusaError.Types.NOT_FOUND, "The wishlist item was not found.")

// Removes an item from the wishlist of the customer. The compensation function restores it.
export const removeWishlistItemStep = createStep(
  "remove-wishlist-item",
  async (input: RemoveWishlistItemInput, { container }) => {
    const service: WishlistModuleService = container.resolve(WISHLIST_MODULE)

    const [wishlist] = await service.listWishlists({ customer_id: input.customer_id })
    if (!wishlist) {
      throw notFound()
    }

    // The filter on the wishlist of the customer is the ownership check.
    const [item] = await service.listWishlistItems({
      id: input.item_id,
      wishlist_id: wishlist.id,
    })
    if (!item) {
      throw notFound()
    }

    await service.softDeleteWishlistItems(item.id)
    return new StepResponse({ id: item.id }, item.id)
  },
  async (itemId: string | undefined, { container }) => {
    if (!itemId) {
      return
    }
    const service: WishlistModuleService = container.resolve(WISHLIST_MODULE)
    await service.restoreWishlistItems(itemId)
  }
)

// Removes an item from the wishlist of a customer.
export const removeWishlistItemWorkflow = createWorkflow(
  "remove-wishlist-item",
  (input: RemoveWishlistItemInput) => {
    const removed = removeWishlistItemStep(input)
    return new WorkflowResponse(removed)
  }
)
