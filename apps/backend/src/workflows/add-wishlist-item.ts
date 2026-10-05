import type { InferTypeOf } from "@medusajs/framework/types"
import { MedusaError, Modules } from "@medusajs/framework/utils"
import {
  createStep,
  createWorkflow,
  StepResponse,
  WorkflowResponse,
} from "@medusajs/framework/workflows-sdk"
import { WISHLIST_MODULE } from "../modules/wishlist"
import type Wishlist from "../modules/wishlist/models/wishlist"
import type WishlistItem from "../modules/wishlist/models/wishlist-item"
import type WishlistModuleService from "../modules/wishlist/service"

export type AddWishlistItemInput = { customer_id: string; variant_id: string }
export type WishlistItemResult = { id: string; wishlist_id: string; product_variant_id: string }

// Holds only the ids that this step created, so that the compensation deletes no other record.
type Created = { wishlist_id?: string; item_id?: string }

// Returns the wishlist of the customer. Creates the wishlist if the customer has none.
async function findOrCreateWishlist(
  service: WishlistModuleService,
  customerId: string
): Promise<{ wishlist: InferTypeOf<typeof Wishlist>; created: boolean }> {
  const [existing] = await service.listWishlists({ customer_id: customerId })
  if (existing) {
    return { wishlist: existing, created: false }
  }
  try {
    const wishlist: InferTypeOf<typeof Wishlist> = await service.createWishlists({
      customer_id: customerId,
    })
    return { wishlist, created: true }
  } catch (error) {
    // A concurrent request can create the wishlist first. The unique index then stops this
    // request. Use the wishlist of the other request.
    const [concurrent] = await service.listWishlists({ customer_id: customerId })
    if (concurrent) {
      return { wishlist: concurrent, created: false }
    }
    throw error
  }
}

// Returns the item of the variant in the wishlist. Creates the item if there is none.
async function findOrCreateItem(
  service: WishlistModuleService,
  wishlistId: string,
  variantId: string
): Promise<{ item: InferTypeOf<typeof WishlistItem>; created: boolean }> {
  const filters = { wishlist_id: wishlistId, product_variant_id: variantId }
  const [existing] = await service.listWishlistItems(filters)
  if (existing) {
    return { item: existing, created: false }
  }
  try {
    const item: InferTypeOf<typeof WishlistItem> = await service.createWishlistItems({
      wishlist_id: wishlistId,
      product_variant_id: variantId,
    })
    return { item, created: true }
  } catch (error) {
    // A concurrent request can add the same variant first. Use the item of that request.
    const [concurrent] = await service.listWishlistItems(filters)
    if (concurrent) {
      return { item: concurrent, created: false }
    }
    throw error
  }
}

// Adds the variant to the wishlist of the customer. Creates the wishlist on the first add.
export const addWishlistItemStep = createStep(
  "add-wishlist-item",
  async (input: AddWishlistItemInput, { container }) => {
    const variants = await container
      .resolve(Modules.PRODUCT)
      .listProductVariants({ id: input.variant_id }, { select: ["id"] })
    if (variants.length === 0) {
      throw new MedusaError(MedusaError.Types.NOT_FOUND, "The product variant was not found.")
    }

    const service: WishlistModuleService = container.resolve(WISHLIST_MODULE)
    const created: Created = {}

    const { wishlist, created: wishlistCreated } = await findOrCreateWishlist(
      service,
      input.customer_id
    )
    if (wishlistCreated) {
      created.wishlist_id = wishlist.id
    }

    const { item, created: itemCreated } = await findOrCreateItem(
      service,
      wishlist.id,
      input.variant_id
    )
    if (itemCreated) {
      created.item_id = item.id
    }

    const result: WishlistItemResult = {
      id: item.id,
      wishlist_id: wishlist.id,
      product_variant_id: item.product_variant_id,
    }
    return new StepResponse(result, created)
  },
  async (created: Created | undefined, { container }) => {
    if (!created) {
      return
    }
    const service: WishlistModuleService = container.resolve(WISHLIST_MODULE)
    if (created.item_id) {
      await service.deleteWishlistItems(created.item_id)
    }
    if (created.wishlist_id) {
      await service.deleteWishlists(created.wishlist_id)
    }
  }
)

// Adds a variant to the wishlist of a customer. An add of a variant that is already in the
// wishlist returns the existing item.
export const addWishlistItemWorkflow = createWorkflow(
  "add-wishlist-item",
  (input: AddWishlistItemInput) => {
    const wishlist_item = addWishlistItemStep(input)
    return new WorkflowResponse({ wishlist_item })
  }
)
