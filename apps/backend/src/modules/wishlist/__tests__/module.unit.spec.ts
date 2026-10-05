import WishlistModule, { WISHLIST_MODULE } from ".."

describe("wishlist module", () => {
  it("has the container name wishlist", () => {
    expect(WISHLIST_MODULE).toBe("wishlist")
  })

  it("exposes the wishlist and the wishlist item as linkables", () => {
    expect(WishlistModule.linkable.wishlist).toBeDefined()
    expect(WishlistModule.linkable.wishlistItem).toBeDefined()
  })
})
