import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { AccountNav } from "#components"

// The auth middleware of /account/orders reads customer and ensureLoaded.
// A logged-in customer keeps the test on the account route.
const { customerState, navigateToMock } = vi.hoisted(() => ({
  customerState: { customer: { value: { id: "cus_1" } }, ensureLoaded: vi.fn(), logout: vi.fn() },
  navigateToMock: vi.fn(),
}))

mockNuxtImport("useCustomer", () => () => customerState)
mockNuxtImport("navigateTo", () => navigateToMock)

beforeEach(() => {
  customerState.ensureLoaded.mockReset().mockResolvedValue(undefined)
  customerState.logout.mockReset().mockResolvedValue(undefined)
  navigateToMock.mockReset()
})

const mountNav = () =>
  mountSuspended(AccountNav, { route: "/account/orders", slots: { default: () => "Orders body" } })

describe("AccountNav", () => {
  it("shows the title, the links, and the page content", async () => {
    const wrapper = await mountNav()

    expect(wrapper.find("h1").text()).toBe("Your account")
    expect(wrapper.find('a[href="/account"]').exists()).toBe(true)
    expect(wrapper.find('a[href="/account/orders"]').exists()).toBe(true)
    expect(wrapper.find('a[href="/account/wishlist"]').exists()).toBe(true)
    expect(wrapper.text()).toContain("Orders body")
  })

  it("marks the link of the current page", async () => {
    const wrapper = await mountNav()

    expect(wrapper.find('nav a[href="/account/orders"]').attributes("aria-current")).toBe("page")
    expect(wrapper.find('nav a[href="/account/wishlist"]').attributes("aria-current")).toBeUndefined()
  })

  it("has one logout button", async () => {
    const wrapper = await mountNav()

    expect(wrapper.findAll('[data-testid="logout"]')).toHaveLength(1)
  })

  it("logs out and opens the home page", async () => {
    const wrapper = await mountNav()

    await wrapper.find('[data-testid="logout"]').trigger("click")
    await flushPromises()

    expect(customerState.logout).toHaveBeenCalledTimes(1)
    expect(navigateToMock).toHaveBeenCalledWith("/")
  })
})
