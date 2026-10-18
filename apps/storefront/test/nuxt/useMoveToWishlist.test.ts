import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { defineComponent, h } from "vue"
import { useMoveToWishlist } from "~/composables/useMoveToWishlist"
import { SIGN_IN_PATH } from "~/utils/authPaths"

const { customer, wishlist, cart, toast, navigateToMock } = await vi.hoisted(async () => {
  const { ref } = await import("vue")
  return {
    customer: { customer: ref<{ id: string } | null>(null), ensureLoaded: vi.fn() },
    wishlist: {
      wishlist: ref<unknown>(null),
      load: vi.fn(),
      add: vi.fn(),
      itemFor: vi.fn(),
    },
    cart: { removeItem: vi.fn() },
    toast: { success: vi.fn(), error: vi.fn() },
    navigateToMock: vi.fn(),
  }
})

vi.mock("vue-sonner", () => ({ toast }))
mockNuxtImport("useCustomer", () => () => customer)
mockNuxtImport("useWishlist", () => () => wishlist)
mockNuxtImport("useCart", () => () => cart)
mockNuxtImport("useLocalePath", () => () => (path: unknown) => path)
mockNuxtImport("navigateTo", () => navigateToMock)

async function runMove() {
  let result!: ReturnType<typeof useMoveToWishlist>
  const Host = defineComponent({
    setup() {
      result = useMoveToWishlist()
      return () => h("div")
    },
  })
  await mountSuspended(Host)
  return result
}

const line = { id: "item_1", variant_id: "v_m", product_title: "Plain T-Shirt" } as never

beforeEach(() => {
  customer.customer.value = null
  customer.ensureLoaded.mockReset().mockResolvedValue(undefined)
  wishlist.wishlist.value = { id: "wl_1", items: [] }
  wishlist.load.mockReset().mockResolvedValue(undefined)
  wishlist.add.mockReset().mockResolvedValue(undefined)
  wishlist.itemFor.mockReset().mockReturnValue(undefined)
  cart.removeItem.mockReset().mockResolvedValue(undefined)
  toast.success.mockReset()
  navigateToMock.mockReset()
})

describe("useMoveToWishlist", () => {
  it("adds the variant, removes the line and shows the toast", async () => {
    customer.customer.value = { id: "cus_1" }
    wishlist.itemFor.mockReturnValue(undefined)

    expect(await (await runMove()).move(line)).toBe("moved")
    expect(wishlist.add).toHaveBeenCalledWith("v_m")
    expect(cart.removeItem).toHaveBeenCalledWith("item_1")
    expect(wishlist.add.mock.invocationCallOrder[0]).toBeLessThan(
      cart.removeItem.mock.invocationCallOrder[0]!
    )
    expect(toast.success).toHaveBeenCalledWith("The product is in your wishlist.", {
      action: { label: "View wishlist", onClick: expect.any(Function) },
    })
    toast.success.mock.calls[0]![1].action.onClick()
    expect(navigateToMock).toHaveBeenCalledWith("/account/wishlist")
  })

  it("loads the wishlist first when it is not loaded", async () => {
    customer.customer.value = { id: "cus_1" }
    wishlist.wishlist.value = null

    await (await runMove()).move(line)
    expect(wishlist.load).toHaveBeenCalledTimes(1)
    expect(wishlist.load.mock.invocationCallOrder[0]).toBeLessThan(
      wishlist.itemFor.mock.invocationCallOrder[0]!
    )
  })

  it("only removes the line when the variant is already in the wishlist", async () => {
    customer.customer.value = { id: "cus_1" }
    wishlist.itemFor.mockReturnValue({ id: "wi_1", product_variant_id: "v_m" })

    await (await runMove()).move(line)
    expect(wishlist.add).not.toHaveBeenCalled()
    expect(wishlist.load).not.toHaveBeenCalled()
    expect(cart.removeItem).toHaveBeenCalledWith("item_1")
  })

  it("sends a guest to the sign-in page and keeps the line", async () => {
    customer.customer.value = null

    expect(await (await runMove()).move(line)).toBe("signIn")
    expect(navigateToMock).toHaveBeenCalledWith({
      path: SIGN_IN_PATH,
      query: { redirect: "/cart" },
    })
    expect(cart.removeItem).not.toHaveBeenCalled()
  })

  it("keeps the line when the wishlist add fails", async () => {
    customer.customer.value = { id: "cus_1" }
    wishlist.itemFor.mockReturnValue(undefined)
    wishlist.add.mockRejectedValue(new Error("offline"))

    await expect((await runMove()).move(line)).rejects.toThrow("offline")
    expect(cart.removeItem).not.toHaveBeenCalled()
    expect(toast.success).not.toHaveBeenCalled()
  })
})
