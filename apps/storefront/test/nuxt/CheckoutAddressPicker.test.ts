import type { HttpTypes } from "@medusajs/types"
import { mountSuspended } from "@nuxt/test-utils/runtime"
import { describe, expect, it } from "vitest"
import { CheckoutAddressPicker } from "#components"
import type { AddressListState } from "~/components/CheckoutAddressPicker.vue"
import type { AddressFormValues } from "~/utils/addressForm"
import { NEW_ADDRESS, emptyAddressForm } from "~/utils/addressForm"

type Picker = Awaited<ReturnType<typeof mountSuspended<typeof CheckoutAddressPicker>>>

const home = {
  id: "a1",
  address_name: "Rumah",
  is_default_shipping: true,
  first_name: "Sari",
  last_name: "Dewi",
  phone: "081234567890",
  address_1: "Jl. Melati No. 12\nRT 03/RW 05",
  city: "Jakarta Pusat",
  province: "DKI Jakarta",
  postal_code: "10310",
} as HttpTypes.StoreCustomerAddress
const fromAdmin = {
  id: "a9",
  address_name: null,
  is_default_shipping: false,
  first_name: "Budi",
  last_name: "Santoso",
  phone: null,
  address_1: "Jl. Kenanga 4",
  city: "Bandung",
  province: null,
  postal_code: null,
} as unknown as HttpTypes.StoreCustomerAddress

// Mounts the picker as a parent with v-model does, so each update goes back into the prop.
async function mountPicker(props: {
  state?: AddressListState
  addresses: HttpTypes.StoreCustomerAddress[]
  selected?: string
}): Promise<Picker> {
  const wrapper: Picker = await mountSuspended(CheckoutAddressPicker, {
    props: {
      addresses: props.addresses,
      state: props.state ?? "ready",
      selected: props.selected ?? "a1",
      form: emptyAddressForm(),
      save: true,
      makeDefault: false,
      errors: {},
      disabled: false,
      "onUpdate:selected": (value: string) => wrapper.setProps({ selected: value }),
      "onUpdate:form": (value: AddressFormValues) => wrapper.setProps({ form: value }),
      "onUpdate:save": (value: boolean) => wrapper.setProps({ save: value }),
      "onUpdate:makeDefault": (value: boolean) => wrapper.setProps({ makeDefault: value }),
    },
  })
  return wrapper
}

describe("CheckoutAddressPicker", () => {
  it("shows two skeleton rows and no fields while the list loads", async () => {
    const wrapper = await mountPicker({ state: "loading", addresses: [] })
    expect(
      wrapper.findAll('[data-testid="address-picker-loading"] [data-slot="skeleton"]')
    ).toHaveLength(2)
    expect(wrapper.find('[data-testid="address-fields"]').exists()).toBe(false)
  })

  it("shows the alert, the retry button, and the fields with no save checkbox after a failed load", async () => {
    const wrapper = await mountPicker({ state: "failed", addresses: [] })
    expect(wrapper.text()).toContain("Your saved addresses did not load.")
    await wrapper.find('[data-testid="address-retry"]').trigger("click")
    expect(wrapper.emitted("retry")).toHaveLength(1)
    expect(wrapper.find('[data-testid="address-fields"] [name="phone"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="save-address"]').exists()).toBe(false)
    expect(wrapper.find('input[name="address_name"]').exists()).toBe(false)
  })

  it("shows the fields, the save checkbox, the label, and the first address hint with no addresses", async () => {
    const wrapper = await mountPicker({ state: "ready", addresses: [], selected: NEW_ADDRESS })
    expect(wrapper.text()).toContain("You have no saved addresses yet.")
    expect(wrapper.find('[data-testid="save-address"]').attributes("data-state")).toBe("checked")
    expect(wrapper.find('input[name="address_name"]').exists()).toBe(true)
    expect(wrapper.text()).toContain(
      "It becomes your default address, because it is your first address."
    )
    expect(wrapper.find('[data-testid="make-default"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="address-option-new"]').exists()).toBe(false)
  })

  it("lists the saved addresses as radio rows with the default badge", async () => {
    const wrapper = await mountPicker({ addresses: [home, fromAdmin], selected: home.id })
    const row = wrapper.get(`[data-testid='address-option-${home.id}']`)
    expect(row.text()).toContain("Rumah")
    expect(row.text()).toContain("Default")
    expect(row.text()).toContain("Sari Dewi · 081234567890")
    expect(row.text()).toContain("Jl. Melati No. 12, RT 03/RW 05, Jakarta Pusat, DKI Jakarta 10310")
    expect(row.classes()).toContain("border-b")
    expect(
      wrapper.findAll("[data-testid^='address-option-']").at(-1)!.attributes("data-testid")
    ).toBe("address-option-new")
    expect(wrapper.html()).not.toContain("bg-primary-soft")
    expect(wrapper.html()).not.toContain("rounded-lg")
    expect(wrapper.get('a[href="/account/addresses"]').text()).toBe("Manage addresses")
  })

  it("shows no null and no lone separator for an address with empty fields", async () => {
    const wrapper = await mountPicker({ addresses: [home, fromAdmin] })
    const row = wrapper.get('[data-testid="address-option-a9"]')
    expect(row.text()).toContain("Address")
    expect(row.text()).toContain("Budi Santoso")
    expect(row.text()).not.toContain("null")
    expect(row.text()).not.toContain("·")
    expect(row.text()).not.toContain("Default")
  })

  it("shows the fields under the list only for a new address", async () => {
    const wrapper = await mountPicker({ addresses: [home], selected: home.id })
    expect(wrapper.find("[data-testid='address-fields']").exists()).toBe(false)
    expect(wrapper.text()).toContain("Ship to an address that is not in your list.")

    await wrapper.setProps({ selected: NEW_ADDRESS })
    expect(wrapper.find("[data-testid='address-fields']").exists()).toBe(true)
    expect(wrapper.find("[role='radiogroup'] [data-testid='address-fields']").exists()).toBe(false)
    expect(wrapper.text()).not.toContain("Ship to an address that is not in your list.")
    expect(wrapper.find("#checkout-address-phone").exists()).toBe(true)
  })

  it("shows the fields, the label, and the default checkbox for a new address", async () => {
    const wrapper = await mountPicker({ state: "ready", addresses: [home], selected: NEW_ADDRESS })
    expect(wrapper.find('[data-testid="address-fields"]').exists()).toBe(true)
    expect(wrapper.find('input[name="address_name"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="make-default"]').exists()).toBe(true)
    expect(wrapper.find('[data-testid="address-option-new"]').text()).not.toContain(
      "Ship to an address that is not in your list."
    )
    await wrapper.find('[data-testid="save-address"]').trigger("click")
    expect(wrapper.emitted("update:save")?.at(-1)).toEqual([false])
    expect(wrapper.find('[data-testid="make-default"]').exists()).toBe(false)
    expect(wrapper.find('input[name="address_name"]').exists()).toBe(false)
  })

  it("writes the selected address id into the model", async () => {
    const wrapper = await mountPicker({ state: "ready", addresses: [home, fromAdmin] })
    await wrapper.find('[data-testid="address-option-a9"] button[role="radio"]').trigger("click")
    expect(wrapper.emitted("update:selected")?.at(-1)).toEqual(["a9"])
  })

  it("writes the label into the form model", async () => {
    const wrapper = await mountPicker({ state: "ready", addresses: [], selected: NEW_ADDRESS })
    await wrapper.find('input[name="address_name"]').setValue("Kantor")
    const forms = wrapper.emitted("update:form") as [AddressFormValues][]
    expect(forms.at(-1)?.[0].address_name).toBe("Kantor")
  })

  it("disables the radio items, the fields, the checkboxes, and the retry button", async () => {
    const wrapper = await mountPicker({ state: "ready", addresses: [home], selected: NEW_ADDRESS })
    await wrapper.setProps({ disabled: true })
    for (const radio of wrapper.findAll('button[role="radio"]')) {
      expect(radio.attributes("disabled")).toBeDefined()
    }
    expect(
      wrapper.find('[data-testid="address-fields"] [name="phone"]').attributes("disabled")
    ).toBeDefined()
    expect(wrapper.find('input[name="address_name"]').attributes("disabled")).toBeDefined()
    expect(wrapper.find('[data-testid="save-address"]').attributes("disabled")).toBeDefined()
    expect(wrapper.find('[data-testid="make-default"]').attributes("disabled")).toBeDefined()

    const failed = await mountPicker({ state: "failed", addresses: [] })
    await failed.setProps({ disabled: true })
    expect(failed.find('[data-testid="address-retry"]').attributes("disabled")).toBeDefined()
  })

  // The Contact card of the checkout page has the id checkout-phone.
  it("gives the address controls ids that do not collide with the Contact card", async () => {
    const wrapper = await mountPicker({ state: "ready", addresses: [], selected: NEW_ADDRESS })
    expect(wrapper.find("#checkout-address-phone").exists()).toBe(true)
    expect(wrapper.find("#checkout-phone").exists()).toBe(false)
  })
})
