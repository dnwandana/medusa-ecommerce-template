import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime"
import type { HttpTypes } from "@medusajs/types"
import { flushPromises } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { AccountNav, AddressDeleteDialog, AddressDialog, Card, Skeleton } from "#components"
import AddressesPage from "~/pages/account/addresses.vue"

const { addresses, customerState } = await vi.hoisted(async () => {
  const { ref } = await import("vue")
  return {
    addresses: {
      addresses: ref<unknown[] | null>(null),
      load: vi.fn(),
      setDefault: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      remove: vi.fn(),
    },
    // The auth middleware and AccountNav read the customer. A logged-in customer keeps the test
    // on the account route.
    customerState: {
      customer: ref<{ id: string } | null>({ id: "cus_1" }),
      ensureLoaded: vi.fn(),
      logout: vi.fn(),
    },
  }
})

const { toast } = vi.hoisted(() => ({ toast: { success: vi.fn(), error: vi.fn() } }))

vi.mock("vue-sonner", () => ({ toast }))

mockNuxtImport("useAddresses", () => () => addresses)
mockNuxtImport("useCustomer", () => () => customerState)

const address = (
  id: string,
  label: string | null,
  isDefault: boolean
): HttpTypes.StoreCustomerAddress =>
  ({
    id,
    address_name: label,
    is_default_shipping: isDefault,
    is_default_billing: false,
    customer_id: "cus_1",
    company: null,
    first_name: "Budi",
    last_name: "Santoso",
    address_1: "Jl. Merdeka 1",
    address_2: null,
    city: "Jakarta",
    country_code: "id",
    province: "DKI Jakarta",
    postal_code: "10110",
    phone: "081234567890",
    metadata: null,
    created_at: "2026-10-01T00:00:00.000Z",
    updated_at: "2026-10-01T00:00:00.000Z",
  }) as HttpTypes.StoreCustomerAddress

const home = address("a1", "Rumah", true)
const office = address("a2", "Kantor", false)

let list: HttpTypes.StoreCustomerAddress[] = []

const mountPage = async () => {
  const wrapper = await mountSuspended(AddressesPage)
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  list = []
  addresses.addresses.value = null
  addresses.load.mockReset().mockImplementation(async () => {
    addresses.addresses.value = list
  })
  addresses.setDefault.mockReset().mockResolvedValue(undefined)
  customerState.customer.value = { id: "cus_1" }
  customerState.ensureLoaded.mockReset().mockResolvedValue(undefined)
  customerState.logout.mockReset().mockResolvedValue(undefined)
  toast.success.mockReset()
  toast.error.mockReset()
})

describe("addresses page", () => {
  it("shows the title and the intro in the account nav", async () => {
    list = [home]
    const wrapper = await mountPage()

    expect(wrapper.findComponent(AccountNav).exists()).toBe(true)
    expect(wrapper.find("h2").text()).toBe("Addresses")
    expect(addresses.load).toHaveBeenCalledTimes(1)
  })

  it("shows three skeleton cards and no add button while the list loads", async () => {
    addresses.load.mockReturnValue(new Promise(() => {}))
    const wrapper = await mountPage()
    expect(wrapper.findAll('[data-testid="address-skeleton"]')).toHaveLength(3)
    expect(wrapper.find('[data-testid="add-address"]').exists()).toBe(false)
  })

  it("shows the empty block with its own add button", async () => {
    list = []
    const wrapper = await mountPage()
    expect(wrapper.text()).toContain("No saved addresses")
    expect(wrapper.text()).toContain(
      "Add an address. It fills in at checkout, so you check out faster."
    )
    expect(wrapper.find('[data-testid="empty-add-address"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="add-address"]').exists()).toBe(false)
  })

  it("opens the add dialog as the first address from the empty block", async () => {
    list = []
    const wrapper = await mountPage()
    await wrapper.find('[data-testid="empty-add-address"]').trigger("click")

    const dialog = wrapper.findComponent(AddressDialog)
    expect(dialog.props("open")).toBe(true)
    expect(dialog.props("address")).toBeNull()
    expect(dialog.props("first")).toBe(true)
  })

  it("shows an alert and loads again after Try again", async () => {
    addresses.load.mockRejectedValueOnce(Object.assign(new Error(), { status: 500 }))
    const wrapper = await mountPage()
    expect(wrapper.text()).toContain("Your addresses did not load.")
    expect(wrapper.find('[data-slot="alert"][role="alert"]').exists()).toBe(true)
    await wrapper.find('[data-testid="addresses-retry"]').trigger("click")
    await flushPromises()
    expect(addresses.load).toHaveBeenCalledTimes(2)
    expect(wrapper.text()).not.toContain("Your addresses did not load.")
  })

  it("shows a card for each address in the order of the list", async () => {
    list = [home, office]
    const wrapper = await mountPage()
    const ids = wrapper
      .findAll('[data-testid^="address-card-"]')
      .map((card) => card.attributes("data-testid"))
    expect(ids).toEqual(["address-card-a1", "address-card-a2"])
    expect(wrapper.text()).toContain("Your default address is selected first at checkout.")
  })

  it("disables all actions during Set as default and shows the success toast", async () => {
    list = [home, office]
    let finish!: () => void
    addresses.setDefault.mockReturnValue(new Promise<void>((resolve) => (finish = resolve)))
    const wrapper = await mountPage()
    await wrapper.find('[data-testid="set-default-a2"]').trigger("click")
    expect(wrapper.find('[data-testid="edit-a1"]').attributes("disabled")).toBeDefined()
    expect(wrapper.find('[data-testid="add-address"]').attributes("disabled")).toBeDefined()
    finish()
    await flushPromises()
    expect(addresses.setDefault).toHaveBeenCalledWith("a2")
    expect(toast.success).toHaveBeenCalledWith("Kantor is now your default address.")
    expect(wrapper.find('[data-testid="edit-a1"]').attributes("disabled")).toBeUndefined()
    expect(wrapper.find('[data-testid="add-address"]').attributes("disabled")).toBeUndefined()
  })

  it("names an address with no label Address in the default toast", async () => {
    list = [home, address("a3", null, false)]
    const wrapper = await mountPage()
    await wrapper.find('[data-testid="set-default-a3"]').trigger("click")
    await flushPromises()
    expect(toast.success).toHaveBeenCalledWith("Address is now your default address.")
  })

  it("shows the error toast when Set as default fails", async () => {
    list = [home, office]
    addresses.setDefault.mockRejectedValue(Object.assign(new Error(), { status: 500 }))
    const wrapper = await mountPage()
    await wrapper.find('[data-testid="set-default-a2"]').trigger("click")
    await flushPromises()
    expect(toast.error).toHaveBeenCalledWith("The default address did not change. Try again.")
    expect(toast.success).not.toHaveBeenCalled()
    expect(wrapper.find('[data-testid="edit-a1"]').attributes("disabled")).toBeUndefined()
  })

  it("shows the added toast after the dialog saves an address", async () => {
    list = [home]
    const wrapper = await mountPage()
    await wrapper.find('[data-testid="add-address"]').trigger("click")
    wrapper.findComponent(AddressDialog).vm.$emit("saved", "added")
    await flushPromises()
    expect(wrapper.findComponent(AddressDialog).props("first")).toBe(false)
    expect(toast.success).toHaveBeenCalledWith("Address added.")
  })

  it("opens the edit dialog with the card address and shows the updated toast", async () => {
    list = [home, office]
    const wrapper = await mountPage()
    await wrapper.find('[data-testid="edit-a2"]').trigger("click")

    const dialog = wrapper.findComponent(AddressDialog)
    expect(dialog.props("open")).toBe(true)
    expect(dialog.props("address")).toMatchObject({ id: "a2" })
    dialog.vm.$emit("saved", "updated")
    await flushPromises()
    expect(toast.success).toHaveBeenCalledWith("Address updated.")
  })

  it("shows the deleted toast after the confirmation deletes an address", async () => {
    list = [home, office]
    const wrapper = await mountPage()
    await wrapper.find('[data-testid="delete-a2"]').trigger("click")
    expect(wrapper.findComponent(AddressDeleteDialog).props("address")).toMatchObject({ id: "a2" })
    wrapper.findComponent(AddressDeleteDialog).vm.$emit("deleted")
    await flushPromises()
    expect(toast.success).toHaveBeenCalledWith("Address deleted.")
  })

  it("draws the skeletons with no Card", async () => {
    addresses.load.mockReturnValue(new Promise(() => {}))
    const wrapper = await mountPage()
    expect(wrapper.findAllComponents(Card)).toHaveLength(0)
    for (const block of wrapper.findAll('[data-testid="address-skeleton"]')) {
      expect(block.classes()).toContain("border-t")
      expect(block.findAllComponents(Skeleton)).toHaveLength(4)
    }
  })

  it("shows the add button as an outline button", async () => {
    list = [home]
    const wrapper = await mountPage()
    expect(wrapper.get('[data-testid="add-address"]').attributes("data-variant")).toBe("outline")
  })

  it("puts the address blocks in one column on phones and two from md", async () => {
    list = [home, office]
    const wrapper = await mountPage()
    const grid = wrapper.get('[data-testid="address-card-a1"]').element.parentElement!
    expect(grid.className).toContain("grid-cols-1")
    expect(grid.className).toContain("md:grid-cols-2")
  })
})
