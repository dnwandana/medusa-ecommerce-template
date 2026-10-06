import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { AccountNav } from "#components"
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

  it("shows the profile card in the account nav with one logout button", async () => {
    const wrapper = await mountSuspended(AccountPage)

    expect(wrapper.findComponent(AccountNav).exists()).toBe(true)
    expect(wrapper.findAll('[data-testid="logout"]')).toHaveLength(1)
    expect(wrapper.find('[data-slot="card-title"]').text()).toBe("Profile")
    expect(wrapper.find('input[name="email"]').exists()).toBe(false)
  })

  it("puts the names on one row and the phone in an input group", async () => {
    const wrapper = await mountSuspended(AccountPage)

    expect(wrapper.find('[data-slot="field-group"].two-col input[name="first_name"]').exists()).toBe(true)
    expect(wrapper.find('[data-slot="field-group"].two-col input[name="last_name"]').exists()).toBe(true)
    expect(wrapper.find('[data-slot="input-group"] input[name="phone"]').attributes("type")).toBe("tel")
  })

  it("shows the saved text next to the save button only after the save", async () => {
    const wrapper = await mountSuspended(AccountPage)
    const footer = () => wrapper.find('[data-slot="card-footer"]')

    expect(footer().find('button[type="submit"]').text()).toBe("Save")
    expect(footer().find('[role="status"]').exists()).toBe(false)

    await wrapper.find("form").trigger("submit")
    await flushPromises()

    expect(footer().find('[role="status"]').text()).toBe("Your profile is saved.")
  })

  it("shows the save error in a destructive alert", async () => {
    customerState.updateProfile.mockRejectedValue(new Error("HTTP 500"))
    const wrapper = await mountSuspended(AccountPage)

    await wrapper.find("form").trigger("submit")
    await flushPromises()

    expect(wrapper.find('[data-slot="alert"][role="alert"]').text()).toBe("An error occurred. Try again.")
  })
})
