import { mountSuspended, mockNuxtImport } from "@nuxt/test-utils/runtime"
import { describe, expect, it, vi } from "vitest"
import AccountShell from "~/components/AccountShell.vue"

const { customerState } = await vi.hoisted(async () => {
  const { ref } = await import("vue")
  return { customerState: { customer: ref<unknown>(null) } }
})

mockNuxtImport("useCustomer", () => () => customerState)

describe("AccountShell", () => {
  it.each([
    [{ first_name: " Sari " }, "Welcome, Sari."],
    [{ first_name: "" }, "Welcome."],
    [{ first_name: "   " }, "Welcome."],
    [{ first_name: null }, "Welcome."],
  ])("greets %j with %s", async (customer, heading) => {
    customerState.customer.value = { id: "cus_1", ...customer }
    const wrapper = await mountSuspended(AccountShell)
    expect(wrapper.get("h1").text()).toBe(heading)
    expect(wrapper.text()).toContain("Your account")
  })

  it("greets with no name before the customer loads", async () => {
    customerState.customer.value = null
    const wrapper = await mountSuspended(AccountShell)
    expect(wrapper.get("h1").text()).toBe("Welcome.")
  })
})
