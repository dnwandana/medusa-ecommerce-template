import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import AccountPage from "~/pages/account/index.vue"

const { customerState, navigateToMock } = await vi.hoisted(async () => {
  const { ref } = await import("vue")
  return {
    customerState: {
      customer: ref<unknown>(null),
      updateProfile: vi.fn(),
      logout: vi.fn(),
    },
    navigateToMock: vi.fn(),
  }
})

mockNuxtImport("useCustomer", () => () => customerState)
mockNuxtImport("navigateTo", () => navigateToMock)
mockNuxtImport("useLocalePath", () => () => (path: string) => path)

const valueOf = (wrapper: Awaited<ReturnType<typeof mountSuspended>>, name: string) =>
  (wrapper.find(`input[name="${name}"]`).element as HTMLInputElement).value

beforeEach(() => {
  customerState.customer.value = {
    id: "cus_1",
    email: "member@example.com",
    first_name: "Budi",
    last_name: "Santoso",
    phone: "081298765432",
  }
  customerState.updateProfile.mockReset().mockResolvedValue(undefined)
  customerState.logout.mockReset().mockResolvedValue(undefined)
  navigateToMock.mockReset()
})

describe("account page", () => {
  it("shows the profile of the customer", async () => {
    const wrapper = await mountSuspended(AccountPage)

    expect(wrapper.text()).toContain("member@example.com")
    expect(valueOf(wrapper, "first_name")).toBe("Budi")
    expect(valueOf(wrapper, "last_name")).toBe("Santoso")
    expect(valueOf(wrapper, "phone")).toBe("081298765432")
    expect(wrapper.find('a[href="/account/orders"]').exists()).toBe(true)
  })

  it("saves the profile and shows the confirmation", async () => {
    const wrapper = await mountSuspended(AccountPage)
    await wrapper.find('input[name="first_name"]').setValue("Budiman")

    await wrapper.find("form").trigger("submit")
    await flushPromises()

    expect(customerState.updateProfile).toHaveBeenCalledWith({
      first_name: "Budiman",
      last_name: "Santoso",
      phone: "081298765432",
    })
    expect(wrapper.text()).toContain("Your profile is saved.")
  })

  it("shows an error when the profile is not saved", async () => {
    customerState.updateProfile.mockRejectedValue(new Error("HTTP 500"))
    const wrapper = await mountSuspended(AccountPage)

    await wrapper.find("form").trigger("submit")
    await flushPromises()

    expect(wrapper.text()).toContain("An error occurred. Try again.")
    expect(wrapper.text()).not.toContain("Your profile is saved.")
  })

  it("logs out and opens the home page", async () => {
    const wrapper = await mountSuspended(AccountPage)

    await wrapper.find('[data-testid="logout"]').trigger("click")
    await flushPromises()

    expect(customerState.logout).toHaveBeenCalledTimes(1)
    expect(navigateToMock).toHaveBeenCalledWith("/")
  })
})
