import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { AppMobileMenu } from "#components"
import { useNuxtApp, useRouter } from "#imports"
import { SIGN_IN_PATH } from "~/utils/authPaths"

const { customerState, navigateToMock } = await vi.hoisted(async () => {
  const { ref } = await import("vue")
  return {
    customerState: { customer: ref<unknown>(null), logout: vi.fn() },
    navigateToMock: vi.fn(),
  }
})

mockNuxtImport("useNavCategories", () => () => ({
  categories: computed(() => [
    { id: "c1", name: "Women", handle: "women" },
    { id: "c2", name: "Men", handle: "men" },
  ]),
  pending: ref(false),
}))
mockNuxtImport("useCustomer", () => () => customerState)
mockNuxtImport("navigateTo", () => navigateToMock)

let mounted: Awaited<ReturnType<typeof mountSuspended>> | undefined
let setLocaleMock: ReturnType<typeof vi.spyOn>

// Unmount first. A mounted menu of an old test still watches the route and its portal is gone.
afterEach(() => {
  mounted?.unmount()
  mounted = undefined
  document.body.innerHTML = ""
  setLocaleMock.mockRestore()
})

beforeEach(() => {
  customerState.customer.value = null
  customerState.logout.mockReset().mockResolvedValue(undefined)
  navigateToMock.mockReset()
  // The component destructures setLocale from the global composer at mount time.
  setLocaleMock = vi.spyOn(useNuxtApp().$i18n, "setLocale").mockResolvedValue(undefined)
})

const openMenu = async () => {
  const wrapper = await mountSuspended(AppMobileMenu, { attachTo: document.body, route: "/" })
  mounted = wrapper
  await wrapper.get("button[aria-label='Menu']").trigger("click")
  await flushPromises()
  return document.body
}

const sheet = () => document.body.querySelector("[role='dialog']")

describe("AppMobileMenu", () => {
  it("lists the categories as large rows and the sign-in link for a guest", async () => {
    const body = await openMenu()
    const rows = [...body.querySelectorAll("[data-slot='category-row']")]

    expect(rows.map((row) => row.textContent?.trim())).toEqual(["Women", "Men", "All products"])
    expect(rows[0]!.classList).toContain("min-h-16")
    expect(rows[0]!.getAttribute("href")).toBe("/categories/women")
    expect(rows[2]!.getAttribute("href")).toBe("/products")
    expect(body.querySelector(`a[href='${SIGN_IN_PATH}']`)?.textContent).toContain("Sign in")
    expect(body.querySelector("a[href='/account/wishlist']")?.textContent).toContain("Wishlist")
    expect(body.textContent).not.toContain("Sign out")
  })

  it("opens from the left and keeps the title for screen readers", async () => {
    await openMenu()

    expect(sheet()?.getAttribute("data-side")).toBe("left")
    expect(sheet()?.querySelector("[data-slot='sheet-title']")?.classList).toContain("sr-only")
    expect(sheet()?.querySelector("[data-slot='sheet-close']")?.textContent).toContain("Close")
  })

  it("lists the account links and Sign out for a customer", async () => {
    customerState.customer.value = { id: "c1" }
    const body = await openMenu()

    expect(body.querySelector("a[href='/account']")?.textContent).toContain("Account")
    expect(body.querySelector("a[href='/account/orders']")?.textContent).toContain("Orders")
    expect(body.querySelector("a[href='/account/wishlist']")?.textContent).toContain("Wishlist")
    expect(body.textContent).toContain("Sign out")
    expect(body.querySelector(`a[href='${SIGN_IN_PATH}']`)).toBeNull()
  })

  it("signs out and opens the home page", async () => {
    customerState.customer.value = { id: "c1" }
    const body = await openMenu()
    const signOut = [...body.querySelectorAll("button")].find((button) =>
      button.textContent?.includes("Sign out")
    )!

    signOut.click()
    await flushPromises()

    expect(customerState.logout).toHaveBeenCalledTimes(1)
    expect(navigateToMock).toHaveBeenCalledWith("/")
  })

  it("changes the language with the segmented control", async () => {
    const body = await openMenu()
    const group = body.querySelector("[role='group'][aria-label='Language']")!
    const buttons = [...group.querySelectorAll("button")] as HTMLButtonElement[]

    expect(buttons.map((button) => button.textContent?.trim())).toEqual([
      "English",
      "Bahasa Indonesia",
    ])
    buttons[1]!.click()
    await flushPromises()

    expect(setLocaleMock).toHaveBeenCalledWith("id")
  })

  // The test router stub of @nuxt/test-utils does not navigate on a link click.
  // Thus the test changes the route through the router.
  it("closes when the route changes", async () => {
    await openMenu()
    expect(sheet()).not.toBeNull()

    await useRouter().push("/products")
    await flushPromises()

    expect(sheet()).toBeNull()
  })
})
