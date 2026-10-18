import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { AccountNav } from "#components"

// The auth middleware of /account/orders reads customer and ensureLoaded.
// A logged-in customer keeps the test on the account route.
const { customerState, navigateToMock } = vi.hoisted(() => ({
  customerState: {
    customer: { value: { id: "cus_1", first_name: "Sari" } },
    ensureLoaded: vi.fn(),
    logout: vi.fn(),
  },
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
  it("shows the greeting, the links, and the page content", async () => {
    const wrapper = await mountNav()

    expect(wrapper.find("h1").text()).toBe("Welcome, Sari.")
    expect(wrapper.find('a[href="/account"]').exists()).toBe(true)
    expect(wrapper.find('a[href="/account/addresses"]').exists()).toBe(true)
    expect(wrapper.find('a[href="/account/orders"]').exists()).toBe(true)
    expect(wrapper.find('a[href="/account/wishlist"]').exists()).toBe(true)
    expect(wrapper.text()).toContain("Orders body")
  })

  it("lists Profile, Orders, Addresses and Wishlist in this order", async () => {
    const wrapper = await mountNav()
    const hrefs = wrapper
      .findAll('[data-testid="side-nav"] a')
      .map((link) => link.attributes("href"))
    expect(hrefs).toEqual([
      "/account",
      "/account/orders",
      "/account/addresses",
      "/account/wishlist",
    ])
  })

  it("lists the same links in the phone tabs", async () => {
    const wrapper = await mountNav()
    const hrefs = wrapper
      .findAll('[data-testid="account-tabs"] a')
      .map((link) => link.attributes("href"))
    expect(hrefs).toEqual([
      "/account",
      "/account/orders",
      "/account/addresses",
      "/account/wishlist",
    ])
  })

  it("marks the current page in the side nav and in the tabs", async () => {
    const wrapper = await mountNav()
    expect(
      wrapper.findAll('a[aria-current="page"]').map((link) => link.attributes("href"))
    ).toEqual(["/account/orders", "/account/orders"])
  })

  it("shows no item counts", async () => {
    const wrapper = await mountNav()
    expect(wrapper.get('[data-testid="side-nav"]').text()).not.toMatch(/\d/)
  })

  it("has one Sign out button that signs out and opens the home page", async () => {
    const wrapper = await mountNav()
    const buttons = wrapper.findAll('[data-testid="sign-out"]')
    expect(buttons).toHaveLength(1)
    expect(buttons[0]!.text()).toBe("Sign out")
    await buttons[0]!.trigger("click")
    await flushPromises()
    expect(customerState.logout).toHaveBeenCalledTimes(1)
    expect(navigateToMock).toHaveBeenCalledWith("/")
  })
})
