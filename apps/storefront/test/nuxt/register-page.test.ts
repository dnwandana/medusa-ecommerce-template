import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import RegisterPage from "~/pages/account/register.vue"

const { customer, navigateToMock } = vi.hoisted(() => ({
  customer: { register: vi.fn() },
  navigateToMock: vi.fn(),
}))

mockNuxtImport("useCustomer", () => () => customer)
mockNuxtImport("navigateTo", () => navigateToMock)
// The account page does not exist before task 26.
mockNuxtImport("useLocalePath", () => () => (path: string) => path)

const submit = async (password: string) => {
  const wrapper = await mountSuspended(RegisterPage, { route: "/account/register" })
  await wrapper.find('input[name="first_name"]').setValue("Sari")
  await wrapper.find('input[name="last_name"]').setValue("Dewi")
  await wrapper.find('input[name="email"]').setValue("sari@example.com")
  await wrapper.find('input[name="password"]').setValue(password)
  await wrapper.find("form").trigger("submit")
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  customer.register.mockReset().mockResolvedValue(undefined)
  navigateToMock.mockReset()
})

describe("register page", () => {
  it("creates the account and opens the account page", async () => {
    await submit("secret-password")

    expect(customer.register).toHaveBeenCalledWith({
      email: "sari@example.com",
      password: "secret-password",
      first_name: "Sari",
      last_name: "Dewi",
    })
    expect(navigateToMock).toHaveBeenCalledWith("/account")
  })

  it("sends no request for a password of fewer than 8 characters", async () => {
    const wrapper = await submit("short")

    expect(customer.register).not.toHaveBeenCalled()
    expect(wrapper.find('[role="alert"]').text()).toBe("Use 8 characters or more.")
  })

  it("shows an error and stays on the page when the registration fails", async () => {
    customer.register.mockRejectedValue(Object.assign(new Error("HTTP 401"), { status: 401 }))

    const wrapper = await submit("secret-password")

    expect(wrapper.find('[role="alert"]').text()).toBe(
      "The account was not created. An account with this email address can exist already."
    )
    expect(navigateToMock).not.toHaveBeenCalled()
  })

  it("puts the first name and the last name on one row", async () => {
    const wrapper = await mountSuspended(RegisterPage, { route: "/account/register" })
    const row = wrapper.find('[data-slot="field-group"]')

    expect(row.classes()).toContain("two-col")
    expect(row.find('input[name="first_name"]').exists()).toBe(true)
    expect(row.find('input[name="last_name"]').exists()).toBe(true)
  })

  it("shows the hint under the password and links the hint to the input", async () => {
    const wrapper = await mountSuspended(RegisterPage, { route: "/account/register" })

    expect(wrapper.find("#register-password-hint").text()).toBe("Use 8 characters or more.")
    expect(wrapper.find("#register-password-hint").attributes("role")).toBeUndefined()
    expect(wrapper.find('input[name="password"]').attributes("aria-describedby")).toBe(
      "register-password-hint"
    )
  })

  it("marks the password invalid for a short password", async () => {
    const wrapper = await submit("short")

    expect(wrapper.find('input[name="password"]').attributes("aria-invalid")).toBe("true")
    expect(wrapper.findAll('[role="alert"]')).toHaveLength(1)
  })

  it("shows the registration error in a destructive alert", async () => {
    customer.register.mockRejectedValue(new Error("HTTP 422"))
    const wrapper = await submit("secret-password")

    expect(wrapper.find('[data-slot="alert"][role="alert"]').exists()).toBe(true)
  })

  it("links to the login page under the card", async () => {
    const wrapper = await mountSuspended(RegisterPage, { route: "/account/register" })

    expect(wrapper.text()).toContain("Have an account?")
    expect(wrapper.find('a[href="/account/login"]').text()).toBe("Log in with an existing account")
  })
})
