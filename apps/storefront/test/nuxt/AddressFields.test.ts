import { mountSuspended } from "@nuxt/test-utils/runtime"
import { describe, expect, it } from "vitest"
import { AddressFields } from "#components"
import type { AddressErrors, AddressFormValues } from "~/utils/addressForm"
import { emptyAddressForm } from "~/utils/addressForm"

const root = '[data-testid="address-fields"]'

type Fields = Awaited<ReturnType<typeof mountSuspended<typeof AddressFields>>>

// Mounts the fields as a parent with v-model does, so each update goes back into the prop.
async function mountFields(props: { errors?: AddressErrors }): Promise<Fields> {
  const wrapper: Fields = await mountSuspended(AddressFields, {
    props: {
      modelValue: emptyAddressForm(),
      "onUpdate:modelValue": (value: AddressFormValues) => wrapper.setProps({ modelValue: value }),
      idPrefix: "test",
      errors: props.errors ?? {},
    },
  })
  return wrapper
}

// Returns the last value that the fields wrote into the model.
function lastModel(wrapper: Fields): AddressFormValues {
  return wrapper.emitted("update:modelValue")!.at(-1)![0] as AddressFormValues
}

describe("AddressFields", () => {
  it("shows the fields in one column in the order of the spec", async () => {
    const wrapper = await mountFields({})
    expect(wrapper.findAll("label").map((label) => label.text())).toEqual([
      "Full name",
      "Mobile number",
      "Address",
      "City or regency",
      "Province",
      "Postal code",
    ])
    expect(wrapper.get("#test-full_name").attributes("autocomplete")).toBe("name")
    expect(wrapper.get("#test-phone-hint").text()).toBe("The courier calls this number.")
    expect(wrapper.find("[name='country_code']").exists()).toBe(false)
    expect(wrapper.find("[name='address_2']").exists()).toBe(false)
    expect(wrapper.find(root).classes()).not.toContain("two-col")
  })

  it("offers the 38 provinces after the placeholder", async () => {
    const wrapper = await mountFields({})
    const options = wrapper.get("select#test-province").findAll("option")
    expect(options).toHaveLength(39)
    expect(options[0]!.text()).toBe("Select a province")
    expect(options[1]!.text()).toBe("Aceh")
    await wrapper.get("select#test-province").setValue("Bali")
    expect(lastModel(wrapper).province).toBe("Bali")
  })

  it("shows the province error", async () => {
    const wrapper = await mountFields({ errors: { province: "checkout.errors.province" } })
    expect(wrapper.get("select#test-province").attributes("aria-invalid")).toBe("true")
    expect(wrapper.text()).toContain("Select a province.")
  })

  it("uses a textarea of 3 rows with the placeholder and the hint for the address", async () => {
    const wrapper = await mountFields({})
    const area = wrapper.find(`${root} textarea[name="address_1"]`)
    expect(area.attributes("rows")).toBe("3")
    expect(area.attributes("placeholder")).toBe("Street and number\nRT/RW, village, district")
    expect(area.attributes("aria-describedby")).toBe("test-address_1-hint")
    expect(wrapper.text()).toContain(
      "Add the details that help the courier, for example a landmark."
    )
  })

  it("shows the error text and marks the field as not valid", async () => {
    const wrapper = await mountFields({ errors: { postal_code: "checkout.errors.postalCode" } })
    expect(wrapper.text()).toContain("Enter a postal code of 5 digits.")
    expect(wrapper.find(`${root} [name="postal_code"]`).attributes("aria-invalid")).toBe("true")
  })

  it("writes a typed value with its line breaks into the model", async () => {
    const wrapper = await mountFields({})
    await wrapper
      .find(`${root} textarea[name="address_1"]`)
      .setValue("Jl. Melati No. 12\nRT 03/RW 05")
    expect(lastModel(wrapper)).toMatchObject({ address_1: "Jl. Melati No. 12\nRT 03/RW 05" })
  })

  it("gives each control an id with the prefix, so two forms on one page do not collide", async () => {
    const wrapper = await mountFields({})
    const area = wrapper.find(`${root} textarea[name="address_1"]`)
    expect(area.attributes("id")).toBe("test-address_1")
    expect(wrapper.find('label[for="test-address_1"]').exists()).toBe(true)
    expect(wrapper.find('label[for="test-province"]').exists()).toBe(true)
  })
})
