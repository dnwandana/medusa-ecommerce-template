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
})
