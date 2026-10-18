import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { AccountMenu } from "#components"
import { SIGN_IN_PATH } from "~/utils/authPaths"

const { customerState, navigateToMock } = await vi.hoisted(async () => {
  const { ref } = await import("vue")
  return {
    customerState: { customer: ref<unknown>(null), logout: vi.fn() },
    navigateToMock: vi.fn(),
  }
})

mockNuxtImport("useCustomer", () => () => customerState)
mockNuxtImport("navigateTo", () => navigateToMock)

// The customer ref is shared. Unmount each menu, so a later change of the ref does not render it.
const mounted: { unmount: () => void }[] = []
const mount = async () => {
  const wrapper = await mountSuspended(AccountMenu, { attachTo: document.body })
  mounted.push(wrapper)
  return wrapper
}

afterEach(() => {
  mounted.splice(0).forEach((wrapper) => wrapper.unmount())
  document.body.innerHTML = ""
})

beforeEach(() => {
  customerState.customer.value = null
  customerState.logout.mockReset().mockResolvedValue(undefined)
  navigateToMock.mockReset()
})

const sari = { id: "c1", first_name: "Sari", last_name: "Wulan", email: "s@x.id" }

const openMenu = async () => {
  const wrapper = await mount()
  const trigger = wrapper.get("button")
  await trigger.trigger("pointerdown", { button: 0, ctrlKey: false })
  await trigger.trigger("click")
  await flushPromises()
  return { wrapper, menu: document.body.querySelector("[role='menu']")! }
}

describe("AccountMenu", () => {
  it("links a guest to the sign-in page", async () => {
    customerState.customer.value = null
    const wrapper = await mount()
    const link = wrapper.get("a")

    expect(link.attributes("href")).toBe(SIGN_IN_PATH)
    expect(link.attributes("aria-label")).toBe("Sign in")
  })

  it("names the trigger with the name of the customer", async () => {
    customerState.customer.value = sari
    const wrapper = await mount()

    expect(wrapper.get("button").attributes("aria-label")).toBe("Account of Sari Wulan")
  })

  it("lists the name and the five account items", async () => {
    customerState.customer.value = sari
    const { menu } = await openMenu()

    expect(menu.textContent).toContain("Sari Wulan")
    expect(
      [...menu.querySelectorAll("[role='menuitem']")].map((item) => item.textContent?.trim())
    ).toEqual(["Profile", "Orders", "Addresses", "Wishlist", "Sign out"])
    expect(menu.querySelector("a[href='/account']")).not.toBeNull()
    expect(menu.querySelector("a[href='/account/orders']")).not.toBeNull()
    expect(menu.querySelector("a[href='/account/addresses']")).not.toBeNull()
    expect(menu.querySelector("a[href='/account/wishlist']")).not.toBeNull()
  })

  it("shows the email when the customer has no name", async () => {
    customerState.customer.value = { id: "c2", first_name: null, last_name: null, email: "a@x.id" }
    const { menu } = await openMenu()

    expect(menu.textContent).toContain("a@x.id")
    expect(menu.textContent).not.toContain("undefined")
    expect(menu.textContent).not.toContain("null")
  })

  it("signs out and opens the home page", async () => {
    customerState.customer.value = sari
    const { menu } = await openMenu()
    const signOut = [...menu.querySelectorAll("[role='menuitem']")].find((item) =>
      item.textContent?.includes("Sign out")
    ) as HTMLElement

    signOut.click()
    await flushPromises()

    expect(customerState.logout).toHaveBeenCalledTimes(1)
    expect(navigateToMock).toHaveBeenCalledWith("/")
  })
})
