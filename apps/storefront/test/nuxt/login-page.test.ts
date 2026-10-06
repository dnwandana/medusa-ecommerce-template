import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import LoginPage from "~/pages/account/login.vue"

const { customer, navigateToMock } = vi.hoisted(() => ({
  customer: { login: vi.fn() },
  navigateToMock: vi.fn(),
}))

mockNuxtImport("useCustomer", () => () => customer)
mockNuxtImport("navigateTo", () => navigateToMock)
// The account page does not exist before task 26.
mockNuxtImport("useLocalePath", () => () => (path: string) => path)

const submit = async (route: string) => {
  const wrapper = await mountSuspended(LoginPage, { route })
  await wrapper.find('input[name="email"]').setValue("member@example.com")
  await wrapper.find('input[name="password"]').setValue("secret-password")
  await wrapper.find("form").trigger("submit")
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  customer.login.mockReset().mockResolvedValue(undefined)
  navigateToMock.mockReset()
})

describe("login page", () => {
  it("logs in and opens the account page", async () => {
    await submit("/account/login")

    expect(customer.login).toHaveBeenCalledWith("member@example.com", "secret-password")
    expect(navigateToMock).toHaveBeenCalledWith("/account")
  })

  it("opens the path of the redirect parameter after the login", async () => {
    await submit("/account/login?redirect=/account/wishlist")

    expect(navigateToMock).toHaveBeenCalledWith("/account/wishlist")
  })

  it("does not follow a redirect parameter to a different site", async () => {
    await submit("/account/login?redirect=//evil.example/account")

    expect(navigateToMock).toHaveBeenCalledWith("/account")
  })

  it("shows an error and stays on the page when the login fails", async () => {
    customer.login.mockRejectedValue(Object.assign(new Error("HTTP 401"), { status: 401 }))

    const wrapper = await submit("/account/login")

    expect(wrapper.find('[role="alert"]').text()).toBe(
      "The email address or the password is not correct."
    )
    expect(navigateToMock).not.toHaveBeenCalled()
  })

  it("shows the result of the password reset", async () => {
    const wrapper = await mountSuspended(LoginPage, { route: "/account/login?reset=1" })

    expect(wrapper.text()).toContain("Your password is changed. Log in with the new password.")
  })

  it("links to the registration page and to the password reset", async () => {
    const wrapper = await mountSuspended(LoginPage, { route: "/account/login" })

    expect(wrapper.text()).toContain("Forgot your password?")
    expect(wrapper.text()).toContain("Create an account")
  })

  // Review Focus: the success message is a status, and the login error is an alert.
  it("shows the reset result as a success status and the login error as an alert", async () => {
    customer.login.mockRejectedValue(Object.assign(new Error("HTTP 401"), { status: 401 }))
    const wrapper = await submit("/account/login?reset=1")

    expect(wrapper.find('[role="status"]').text()).toBe("Your password is changed. Log in with the new password.")
    expect(wrapper.find('[role="alert"]').text()).toBe("The email address or the password is not correct.")
  })

  it("uses an email input group and the password input", async () => {
    const wrapper = await mountSuspended(LoginPage, { route: "/account/login" })

    expect(wrapper.find('[data-slot="input-group"] input[name="email"]').exists()).toBe(true)
    expect(wrapper.find('button[aria-label="Show the password"]').exists()).toBe(true)
  })

  it("puts the forgot link next to the password label and the register link under the card", async () => {
    const wrapper = await mountSuspended(LoginPage, { route: "/account/login" })

    expect(wrapper.find('[data-slot="card"] a[href="/account/forgot-password"]').text()).toBe("Forgot your password?")
    expect(wrapper.text()).toContain("New here?")
    expect(wrapper.find('a[href="/account/register"]').classes()).toContain("w-full")
  })

  it("shows a spinner and disables the button while the login runs", async () => {
    customer.login.mockReturnValue(new Promise(() => {}))
    const wrapper = await mountSuspended(LoginPage, { route: "/account/login" })

    await wrapper.find("form").trigger("submit")

    expect(wrapper.find('button[type="submit"]').attributes("disabled")).toBeDefined()
    expect(wrapper.find('button[type="submit"] svg.animate-spin').exists()).toBe(true)
  })
})
