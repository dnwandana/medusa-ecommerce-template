import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import ForgotPasswordPage from "~/pages/account/forgot-password.vue"

const { customer } = vi.hoisted(() => ({
  customer: { requestPasswordReset: vi.fn() },
}))

mockNuxtImport("useCustomer", () => () => customer)

const sent = "If an account exists for this email address, we sent a reset link."

const submit = async () => {
  const wrapper = await mountSuspended(ForgotPasswordPage, { route: "/account/forgot-password" })
  await wrapper.find('input[name="email"]').setValue("member@example.com")
  await wrapper.find("form").trigger("submit")
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  customer.requestPasswordReset.mockReset().mockResolvedValue(undefined)
})

describe("forgot password page", () => {
  it("requests the link and replaces the form with the confirmation", async () => {
    const wrapper = await submit()

    expect(customer.requestPasswordReset).toHaveBeenCalledWith("member@example.com")
    expect(wrapper.text()).toContain(sent)
    expect(wrapper.find("form").exists()).toBe(false)
  })

  it("shows the same confirmation when the request fails", async () => {
    customer.requestPasswordReset.mockRejectedValue(new Error("HTTP 500"))

    const wrapper = await submit()

    expect(wrapper.text()).toContain(sent)
    expect(wrapper.find("form").exists()).toBe(false)
  })
})
