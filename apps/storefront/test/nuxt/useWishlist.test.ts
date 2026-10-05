import { mockNuxtImport } from "@nuxt/test-utils/runtime"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { clearNuxtState, useWishlist } from "#imports"

const { sdk } = vi.hoisted(() => ({ sdk: { client: { fetch: vi.fn() } } }))

mockNuxtImport("useMedusa", () => () => sdk)

const item = (id: string, variantId: string) => ({ id, product_variant_id: variantId })

beforeEach(() => {
  clearNuxtState()
  sdk.client.fetch.mockReset()
})

describe("useWishlist", () => {
  it("loads the wishlist of the customer", async () => {
    sdk.client.fetch.mockResolvedValue({
      wishlist: { id: "wl_1", items: [item("wi_1", "variant_1")] },
    })
    const { load, wishlist, itemFor } = useWishlist()

    await load()

    expect(sdk.client.fetch).toHaveBeenCalledWith("/store/customers/me/wishlist")
    expect(wishlist.value?.items).toHaveLength(1)
    expect(itemFor("variant_1")?.id).toBe("wi_1")
    expect(itemFor("variant_2")).toBeUndefined()
  })

  it("has no wishlist for a guest", async () => {
    sdk.client.fetch.mockRejectedValue(Object.assign(new Error("Unauthorized"), { status: 401 }))
    const { load, wishlist } = useWishlist()

    await expect(load()).resolves.toBeUndefined()

    expect(wishlist.value).toBeNull()
  })

  it("adds a variant and loads the wishlist again", async () => {
    sdk.client.fetch
      .mockResolvedValueOnce({ wishlist_item: { id: "wi_2" } })
      .mockResolvedValueOnce({ wishlist: { id: "wl_1", items: [item("wi_2", "variant_2")] } })
    const { add, itemFor } = useWishlist()

    await add("variant_2")

    expect(sdk.client.fetch).toHaveBeenNthCalledWith(1, "/store/customers/me/wishlist/items", {
      method: "POST",
      body: { variant_id: "variant_2" },
    })
    expect(sdk.client.fetch).toHaveBeenNthCalledWith(2, "/store/customers/me/wishlist")
    expect(itemFor("variant_2")?.id).toBe("wi_2")
  })

  it("removes an item from the server and from the state", async () => {
    sdk.client.fetch.mockResolvedValueOnce({
      wishlist: { id: "wl_1", items: [item("wi_1", "variant_1"), item("wi_2", "variant_2")] },
    })
    const { load, remove, wishlist } = useWishlist()
    await load()
    sdk.client.fetch.mockResolvedValueOnce({ id: "wi_1", object: "wishlist_item", deleted: true })

    await remove("wi_1")

    expect(sdk.client.fetch).toHaveBeenLastCalledWith("/store/customers/me/wishlist/items/wi_1", {
      method: "DELETE",
    })
    expect(wishlist.value?.items.map((entry) => entry.id)).toEqual(["wi_2"])
  })
})
