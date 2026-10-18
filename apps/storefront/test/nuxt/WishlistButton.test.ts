import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { WishlistButton } from "#components"
import { SIGN_IN_PATH } from "~/utils/authPaths"

const { customerState, wishlist, navigateToMock } = await vi.hoisted(async () => {
  const { ref } = await import("vue")
  return {
    customerState: { customer: ref<{ id: string } | null>(null), ensureLoaded: vi.fn() },
    wishlist: {
      wishlist: ref<unknown>(null),
      load: vi.fn(),
      add: vi.fn(),
      remove: vi.fn(),
      itemFor: vi.fn(),
    },
    navigateToMock: vi.fn(),
  }
})

const { toast } = vi.hoisted(() => ({ toast: { success: vi.fn(), error: vi.fn() } }))

vi.mock("vue-sonner", () => ({ toast }))

mockNuxtImport("useCustomer", () => () => customerState)
mockNuxtImport("useWishlist", () => () => wishlist)
mockNuxtImport("useLocalePath", () => () => (path: string) => path)
mockNuxtImport("navigateTo", () => navigateToMock)

const mountButton = async (variantId: string | null) => {
  const wrapper = await mountSuspended(WishlistButton, { props: { variantId } })
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  customerState.customer.value = { id: "cus_1" }
  customerState.ensureLoaded.mockReset().mockResolvedValue(undefined)
  wishlist.load.mockReset().mockResolvedValue(undefined)
  wishlist.add.mockReset().mockResolvedValue(undefined)
  wishlist.remove.mockReset().mockResolvedValue(undefined)
  wishlist.itemFor.mockReset().mockReturnValue(undefined)
  navigateToMock.mockReset()
  toast.error.mockReset()
})

describe("WishlistButton", () => {
  it("is an icon button with a label that tells the state", async () => {
    const wrapper = await mountButton("variant_1")
    const button = wrapper.find("button")

    expect(button.text()).toBe("")
    expect(button.attributes("aria-label")).toBe("Save to wishlist")
    expect(button.attributes("aria-pressed")).toBe("false")

    wishlist.itemFor.mockReturnValue({ id: "item_1" })
    const saved = await mountButton("variant_1")
    expect(saved.find("button").attributes("aria-label")).toBe("Remove from wishlist")
    expect(saved.find("svg").classes()).toContain("fill-current")
    expect(saved.find("svg").classes()).not.toContain("text-sale")
  })

  it("tells a guest to sign in", async () => {
    customerState.customer.value = null
    const wrapper = await mountButton("variant_1")

    expect(wrapper.find("button").attributes("title")).toBe("Sign in to save to your wishlist")
  })

  it("has the overlay look for a card", async () => {
    const wrapper = await mountSuspended(WishlistButton, {
      props: { variantId: "variant_1", look: "overlay" },
    })

    expect(wrapper.find("button").classes()).toContain("size-11")
    expect(wrapper.find("button").classes()).not.toContain("border")
  })

  it("sends a guest to the login page and comes back to the same page", async () => {
    customerState.customer.value = null
    const wrapper = await mountButton("variant_1")

    await wrapper.find("button").trigger("click")
    await flushPromises()

    expect(navigateToMock).toHaveBeenCalledWith({
      path: SIGN_IN_PATH,
      query: { redirect: "/" },
    })
    expect(wishlist.add).not.toHaveBeenCalled()
  })

  it("adds the variant for a logged-in customer", async () => {
    const wrapper = await mountButton("variant_1")

    expect(wrapper.find("button").attributes("aria-label")).toBe("Save to wishlist")
    await wrapper.find("button").trigger("click")
    await flushPromises()

    expect(wishlist.add).toHaveBeenCalledWith("variant_1")
  })

  it("removes the item when the variant is in the wishlist", async () => {
    wishlist.itemFor.mockReturnValue({ id: "wi_1", product_variant_id: "variant_1" })
    const wrapper = await mountButton("variant_1")

    expect(wrapper.find("button").attributes("aria-label")).toBe("Remove from wishlist")
    expect(wrapper.find("button").attributes("aria-pressed")).toBe("true")
    await wrapper.find("button").trigger("click")
    await flushPromises()

    expect(wishlist.remove).toHaveBeenCalledWith("wi_1")
    expect(wishlist.add).not.toHaveBeenCalled()
  })

  it("asks for the options when no variant is selected", async () => {
    const wrapper = await mountButton(null)

    await wrapper.find("button").trigger("click")
    await flushPromises()

    expect(toast.error).toHaveBeenCalledWith("Select the options first.")
    expect(wishlist.add).not.toHaveBeenCalled()
  })

  it("shows an error when the request fails", async () => {
    wishlist.add.mockRejectedValue(new Error("HTTP 500"))
    const wrapper = await mountButton("variant_1")

    await wrapper.find("button").trigger("click")
    await flushPromises()

    expect(toast.error).toHaveBeenCalledWith("The wishlist did not change. Try again.")
  })

  it("fills the heart when the variant is in the wishlist", async () => {
    wishlist.itemFor.mockReturnValue({ id: "wi_1", product_variant_id: "variant_1" })
    const wrapper = await mountButton("variant_1")

    expect(wrapper.find("button svg").classes()).toContain("fill-current")
  })

  it("shows an empty heart when the variant is not in the wishlist", async () => {
    const wrapper = await mountButton("variant_1")

    expect(wrapper.find("button svg").classes()).not.toContain("fill-current")
    // The square look is a 56 px square with an ink border, next to "Add to cart".
    expect(wrapper.find("button").classes()).toContain("size-14")
    expect(wrapper.find("button").classes()).toContain("border-foreground")
  })

  it("shows no inline message", async () => {
    wishlist.add.mockRejectedValue(new Error("HTTP 500"))
    const wrapper = await mountButton("variant_1")

    await wrapper.find("button").trigger("click")
    await flushPromises()

    expect(wrapper.find('[role="status"]').exists()).toBe(false)
  })
})
