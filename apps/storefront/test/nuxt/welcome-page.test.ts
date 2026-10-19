import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import WelcomePage from "~/pages/account/welcome.vue"
import { readHead } from "./helpers/head"

const { customer, navigateToMock, localePathMock } = await vi.hoisted(async () => {
  const { ref } = await import("vue")
  return {
    customer: {
      customer: ref<unknown>({ id: "cus_1", email: "sari@example.com" }),
      ensureLoaded: vi.fn(),
      needsWelcome: ref(true),
      completeWelcome: vi.fn(),
    },
    navigateToMock: vi.fn(),
    localePathMock: vi.fn((path: string) => path),
  }
})

mockNuxtImport("useCustomer", () => () => customer)
mockNuxtImport("navigateTo", () => navigateToMock)
mockNuxtImport("useLocalePath", () => () => localePathMock)

beforeEach(() => {
  customer.needsWelcome.value = true
  customer.ensureLoaded.mockReset().mockResolvedValue(undefined)
  customer.completeWelcome.mockReset().mockResolvedValue(undefined)
  navigateToMock.mockReset()
  localePathMock.mockReset().mockImplementation((path: string) => path)
})

describe("welcome page", () => {
  it("shows the store name in the title", async () => {
    const wrapper = await mountSuspended(WelcomePage, { route: "/account/welcome" })
    expect(wrapper.get("h1").text()).toBe("Welcome to Everyday")
    expect(wrapper.text()).toContain("Your account is ready. What should we call you?")
    const input = wrapper.get('input[name="full_name"]')
    expect(input.attributes("autocomplete")).toBe("name")
  })

  it("gives the tab a title with no store name, because the layout adds the store name", async () => {
    await mountSuspended(WelcomePage, { route: "/account/welcome" })
    expect((await readHead()).title).toBe("Welcome")
  })

  it("asks for a name before Continue", async () => {
    const wrapper = await mountSuspended(WelcomePage, { route: "/account/welcome" })
    await wrapper.get('input[name="full_name"]').setValue("   ")
    await wrapper.get("form").trigger("submit")
    expect(wrapper.text()).toContain("Type your full name, or click Skip.")
    expect(wrapper.get('input[name="full_name"]').attributes("aria-invalid")).toBe("true")
    expect(customer.completeWelcome).not.toHaveBeenCalled()
  })

  it("sends the name and opens the redirect", async () => {
    const wrapper = await mountSuspended(WelcomePage, {
      route: "/account/welcome?redirect=/checkout",
    })
    await wrapper.get('input[name="full_name"]').setValue("Muhammad Rizky Pratama")
    await wrapper.get("form").trigger("submit")
    await flushPromises()
    expect(customer.completeWelcome).toHaveBeenCalledWith("Muhammad Rizky Pratama")
    expect(navigateToMock).toHaveBeenCalledWith("/checkout")
  })

  it("adds the locale prefix to a redirect that has none", async () => {
    localePathMock.mockImplementation((path: string) =>
      path.startsWith("/id") ? path : `/id${path}`
    )
    const wrapper = await mountSuspended(WelcomePage, {
      route: "/account/welcome?redirect=/checkout",
    })
    await wrapper.get('input[name="full_name"]').setValue("Sari Dewi")
    await wrapper.get("form").trigger("submit")
    await flushPromises()
    expect(navigateToMock).toHaveBeenCalledWith("/id/checkout")
  })

  it("skips with no name and opens the account page", async () => {
    const wrapper = await mountSuspended(WelcomePage, { route: "/account/welcome" })
    await wrapper.get('[data-testid="skip"]').trigger("click")
    await flushPromises()
    expect(customer.completeWelcome).toHaveBeenCalledWith(null)
    expect(navigateToMock).toHaveBeenCalledWith("/account")
  })

  it("sends one call for a double click", async () => {
    let finish!: () => void
    customer.completeWelcome.mockReturnValue(
      new Promise<void>((resolve) => {
        finish = resolve
      })
    )
    const wrapper = await mountSuspended(WelcomePage, { route: "/account/welcome" })
    await wrapper.get('[data-testid="skip"]').trigger("click")
    await wrapper.get('[data-testid="skip"]').trigger("click")
    await wrapper.get("form").trigger("submit")
    expect(wrapper.get('[data-testid="skip"]').attributes("disabled")).toBeDefined()
    expect(wrapper.get('button[type="submit"]').attributes("disabled")).toBeDefined()
    finish()
    await flushPromises()
    expect(customer.completeWelcome).toHaveBeenCalledTimes(1)
  })

  it("opens the next page when the call fails", async () => {
    customer.completeWelcome.mockRejectedValue(new Error("HTTP 500"))
    const wrapper = await mountSuspended(WelcomePage, { route: "/account/welcome" })
    await wrapper.get('[data-testid="skip"]').trigger("click")
    await flushPromises()
    expect(navigateToMock).toHaveBeenCalledWith("/account")
  })

  it("does not follow a redirect to a different site", async () => {
    const wrapper = await mountSuspended(WelcomePage, {
      route: "/account/welcome?redirect=//evil.example",
    })
    await wrapper.get('[data-testid="skip"]').trigger("click")
    await flushPromises()
    expect(navigateToMock).toHaveBeenCalledWith("/account")
  })

  it("leaves at once when the welcome step is done", async () => {
    customer.needsWelcome.value = false
    await mountSuspended(WelcomePage, { route: "/account/welcome?redirect=//evil.example" })
    expect(navigateToMock).toHaveBeenCalledWith("/account")
    expect(customer.completeWelcome).not.toHaveBeenCalled()
  })
})
