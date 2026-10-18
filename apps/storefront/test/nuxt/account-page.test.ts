import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { AccountNav } from "#components"
import AccountPage from "~/pages/account/index.vue"

// The auth middleware of /account reads customer and ensureLoaded.
const { customerState, navigateToMock } = await vi.hoisted(async () => {
  const { ref } = await import("vue")
  return {
    customerState: {
      customer: ref<unknown>(null),
      ensureLoaded: vi.fn(),
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
  (wrapper.get(`input[name="${name}"]`).element as HTMLInputElement).value

beforeEach(() => {
  customerState.customer.value = {
    id: "cus_1",
    email: "sari@example.com",
    first_name: "Muhammad Rizky",
    last_name: "Pratama",
    phone: "081234567890",
  }
  customerState.ensureLoaded.mockReset().mockResolvedValue(undefined)
  customerState.updateProfile.mockReset().mockResolvedValue(undefined)
  customerState.logout.mockReset().mockResolvedValue(undefined)
  navigateToMock.mockReset()
})

describe("account page", () => {
  it("shows the profile in the account frame with no card", async () => {
    const wrapper = await mountSuspended(AccountPage, { route: "/account" })

    expect(wrapper.findComponent(AccountNav).exists()).toBe(true)
    expect(wrapper.find('[data-slot="card"]').exists()).toBe(false)
    expect(wrapper.get("h2").text()).toBe("Profile")
  })

  it("shows the email as text and the joined full name", async () => {
    const wrapper = await mountSuspended(AccountPage, { route: "/account" })
    expect(wrapper.find('input[name="email"]').exists()).toBe(false)
    expect(wrapper.text()).toContain("sari@example.com")
    expect(valueOf(wrapper, "full_name")).toBe("Muhammad Rizky Pratama")
    expect(wrapper.get('input[name="full_name"]').attributes("autocomplete")).toBe("name")
    expect(wrapper.find('input[name="first_name"]').exists()).toBe(false)
    expect(wrapper.find('input[name="last_name"]').exists()).toBe(false)
  })

  it("shows the phone in a tel field", async () => {
    const wrapper = await mountSuspended(AccountPage, { route: "/account" })
    const phone = wrapper.get('input[name="phone"]')
    expect(phone.attributes("type")).toBe("tel")
    expect(phone.attributes("autocomplete")).toBe("tel")
    expect(valueOf(wrapper, "phone")).toBe("081234567890")
  })

  it("splits the full name at the last space when it saves", async () => {
    const wrapper = await mountSuspended(AccountPage, { route: "/account" })
    await wrapper.get('input[name="full_name"]').setValue("Sari Dewi Lestari")
    await wrapper.get("form").trigger("submit")
    await flushPromises()
    expect(customerState.updateProfile).toHaveBeenCalledWith({
      first_name: "Sari Dewi",
      last_name: "Lestari",
      phone: "081234567890",
    })
    expect(wrapper.get('[role="status"]').text()).toBe("Your profile is saved.")
  })

  it("saves a one-word name with an empty last name", async () => {
    const wrapper = await mountSuspended(AccountPage, { route: "/account" })
    await wrapper.get('input[name="full_name"]').setValue("Sari")
    await wrapper.get("form").trigger("submit")
    await flushPromises()
    expect(customerState.updateProfile).toHaveBeenCalledWith({
      first_name: "Sari",
      last_name: "",
      phone: "081234567890",
    })
  })

  it("saves an empty full name as empty names", async () => {
    const wrapper = await mountSuspended(AccountPage, { route: "/account" })
    await wrapper.get('input[name="full_name"]').setValue("  ")
    await wrapper.get("form").trigger("submit")
    await flushPromises()
    expect(customerState.updateProfile).toHaveBeenCalledWith({
      first_name: "",
      last_name: "",
      phone: "081234567890",
    })
  })

  it("shows Saving while the save runs", async () => {
    customerState.updateProfile.mockReturnValue(new Promise(() => {}))
    const wrapper = await mountSuspended(AccountPage, { route: "/account" })
    await wrapper.get("form").trigger("submit")
    expect(wrapper.get('button[type="submit"]').text()).toContain("Saving…")
    expect(wrapper.get('button[type="submit"]').attributes("disabled")).toBeDefined()
  })

  it("shows the save error", async () => {
    customerState.updateProfile.mockRejectedValue(new Error("HTTP 500"))
    const wrapper = await mountSuspended(AccountPage, { route: "/account" })
    await wrapper.get("form").trigger("submit")
    await flushPromises()
    expect(wrapper.get('[data-slot="alert"][role="alert"]').text()).toBe(
      "Your profile was not saved. Try again."
    )
    expect(wrapper.find('[role="status"]').exists()).toBe(false)
  })

  it("hides the saved text after a change to a field", async () => {
    const wrapper = await mountSuspended(AccountPage, { route: "/account" })
    await wrapper.get("form").trigger("submit")
    await flushPromises()
    expect(wrapper.find('[role="status"]').exists()).toBe(true)

    await wrapper.get('input[name="phone"]').setValue("081298765432")

    expect(wrapper.find('[role="status"]').exists()).toBe(false)
  })
})
