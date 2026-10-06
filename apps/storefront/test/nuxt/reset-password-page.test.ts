import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import ResetPasswordPage from "~/pages/account/reset-password.vue"

const { customer, navigateToMock } = vi.hoisted(() => ({
  customer: { resetPassword: vi.fn() },
  navigateToMock: vi.fn(),
}))

mockNuxtImport("useCustomer", () => () => customer)
mockNuxtImport("navigateTo", () => navigateToMock)
mockNuxtImport("useLocalePath", () => () => (path: string) => path)

const link = "/account/reset-password?token=tok_123&email=member%40example.com"

const submit = async (password: string) => {
  const wrapper = await mountSuspended(ResetPasswordPage, { route: link })
  await wrapper.find('input[name="password"]').setValue(password)
  await wrapper.find("form").trigger("submit")
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  customer.resetPassword.mockReset().mockResolvedValue(undefined)
  navigateToMock.mockReset()
})

describe("reset password page", () => {
  it("saves the password with the token and the email address of the link", async () => {
    await submit("new-secret-password")

    expect(customer.resetPassword).toHaveBeenCalledWith({
      email: "member@example.com",
      password: "new-secret-password",
      token: "tok_123",
    })
    expect(navigateToMock).toHaveBeenCalledWith({
      path: "/account/login",
      query: { reset: "1" },
    })
  })

  it("shows no form for a link without a token", async () => {
    const wrapper = await mountSuspended(ResetPasswordPage, {
      route: "/account/reset-password?email=member%40example.com",
    })

    expect(wrapper.text()).toContain("The reset link is incomplete. Request a new link.")
    expect(wrapper.find("form").exists()).toBe(false)
  })

  it("sends no request for a password of fewer than 8 characters", async () => {
    const wrapper = await submit("short")

    expect(customer.resetPassword).not.toHaveBeenCalled()
    expect(wrapper.find('[role="alert"]').text()).toBe("Use 8 characters or more.")
  })

  it("shows an error for a token that is not valid", async () => {
    customer.resetPassword.mockRejectedValue(Object.assign(new Error("HTTP 401"), { status: 401 }))

    const wrapper = await submit("new-secret-password")

    expect(wrapper.find('[role="alert"]').text()).toBe(
      "The reset link is not valid or it expired. Request a new link."
    )
    expect(navigateToMock).not.toHaveBeenCalled()
  })

  it("shows the hint under the new password and links the hint to the input", async () => {
    const wrapper = await mountSuspended(ResetPasswordPage, { route: link })

    expect(wrapper.find("#reset-password-hint").text()).toBe("Use 8 characters or more.")
    expect(wrapper.find('input[name="password"]').attributes("aria-describedby")).toBe("reset-password-hint")
    expect(wrapper.find('button[aria-label="Show the password"]').exists()).toBe(true)
  })

  it("shows a destructive alert and an outline link for an incomplete link", async () => {
    const wrapper = await mountSuspended(ResetPasswordPage, {
      route: "/account/reset-password?token=tok_123",
    })

    expect(wrapper.find('[data-slot="alert"][role="alert"]').text()).toBe("The reset link is incomplete. Request a new link.")
    expect(wrapper.find('a[href="/account/forgot-password"]').text()).toBe("Send the link")
    expect(wrapper.find("form").exists()).toBe(false)
  })

  it("shows the forgot link after a reset error", async () => {
    customer.resetPassword.mockRejectedValue(new Error("HTTP 401"))
    const wrapper = await submit("new-secret-password")

    expect(wrapper.find('a[href="/account/forgot-password"]').exists()).toBe(true)
  })
})
