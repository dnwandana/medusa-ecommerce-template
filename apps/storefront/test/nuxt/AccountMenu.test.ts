import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { AccountMenu } from "#components"

const { customerState, navigateToMock } = vi.hoisted(() => ({
  customerState: { logout: vi.fn() },
  navigateToMock: vi.fn(),
}))

mockNuxtImport("useCustomer", () => () => customerState)
mockNuxtImport("navigateTo", () => navigateToMock)

afterEach(() => {
  document.body.innerHTML = ""
})

beforeEach(() => {
  customerState.logout.mockReset().mockResolvedValue(undefined)
  navigateToMock.mockReset()
})

const open = async (wrapper: Awaited<ReturnType<typeof mountSuspended>>) => {
  const trigger = wrapper.find("button")
  await trigger.trigger("pointerdown", { button: 0, ctrlKey: false })
  await trigger.trigger("click")
}

describe("AccountMenu", () => {
  it("names the icon trigger Account", async () => {
    const wrapper = await mountSuspended(AccountMenu, { attachTo: document.body })

    expect(wrapper.find("button").attributes("aria-label")).toBe("Account")
  })

  it("links to the account, the orders, and the wishlist", async () => {
    const wrapper = await mountSuspended(AccountMenu, { attachTo: document.body })
    await open(wrapper)
    const menu = document.body.querySelector('[role="menu"]')!

    expect(menu.querySelector('a[href="/account"]')?.textContent).toContain("Account")
    expect(menu.querySelector('a[href="/account/orders"]')?.textContent).toContain("Orders")
    expect(menu.querySelector('a[href="/account/wishlist"]')?.textContent).toContain("Wishlist")
  })

  it("logs out and opens the home page", async () => {
    const wrapper = await mountSuspended(AccountMenu, { attachTo: document.body })
    await open(wrapper)
    const logout = [...document.body.querySelectorAll('[role="menuitem"]')].find((item) =>
      item.textContent?.includes("Log out")
    ) as HTMLElement

    logout.click()
    await flushPromises()

    expect(customerState.logout).toHaveBeenCalledTimes(1)
    expect(navigateToMock).toHaveBeenCalledWith("/")
  })
})
