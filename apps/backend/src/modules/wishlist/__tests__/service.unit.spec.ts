import WishlistModuleService from "../service"

describe("wishlist service", () => {
  it("has the generated methods for wishlists and wishlist items", () => {
    for (const name of [
      "createWishlists",
      "listWishlists",
      "deleteWishlists",
      "createWishlistItems",
      "listWishlistItems",
      "softDeleteWishlistItems",
      "restoreWishlistItems",
      "deleteWishlistItems",
    ]) {
      expect(typeof (WishlistModuleService.prototype as any)[name]).toBe("function")
    }
  })
})
