import { mountSuspended } from "@nuxt/test-utils/runtime"
import { describe, expect, it } from "vitest"
import { AddressFields } from "#components"
import type { AddressErrors, AddressFormValues } from "~/utils/addressForm"
import { emptyAddressForm } from "~/utils/addressForm"

const root = '[data-testid="address-fields"]'

type Fields = Awaited<ReturnType<typeof mountSuspended<typeof AddressFields>>>

// Mounts the fields as a parent with v-model does, so each update goes back into the prop.
async function mountFields(props: { phone: boolean; errors?: AddressErrors }): Promise<Fields> {
  const wrapper: Fields = await mountSuspended(AddressFields, {
    props: {
      modelValue: emptyAddressForm(),
      "onUpdate:modelValue": (value: AddressFormValues) => wrapper.setProps({ modelValue: value }),
      idPrefix: "test",
      errors: props.errors ?? {},
      phone: props.phone,
    },
  })
  return wrapper
}

describe("AddressFields", () => {
  it("shows the fields in one column in the order of the spec", async () => {
    const wrapper = await mountFields({ phone: true })
    const names = wrapper.findAll(`${root} [name]`).map((el) => el.attributes("name"))
    expect(names).toEqual([
      "first_name",
      "last_name",
      "phone",
      "address_1",
      "city",
      "province",
      "postal_code",
    ])
    expect(wrapper.find(root).classes()).not.toContain("two-col")
  })

  it("uses a textarea of 3 rows with the placeholder and the hint for the address", async () => {
    const wrapper = await mountFields({ phone: true })
    const area = wrapper.find(`${root} textarea[name="address_1"]`)
    expect(area.attributes("rows")).toBe("3")
    expect(area.attributes("placeholder")).toBe("Street and number\nRT/RW, village, district")
    expect(wrapper.text()).toContain(
      "Add the details that help the courier, for example a landmark."
    )
  })

  it("shows the phone hint, and no phone field when phone is false", async () => {
    expect((await mountFields({ phone: true })).text()).toContain("The courier calls this number.")
    expect((await mountFields({ phone: false })).find(`${root} [name="phone"]`).exists()).toBe(
      false
    )
  })

  it("shows the error text and marks the field as not valid", async () => {
    const wrapper = await mountFields({
      phone: true,
      errors: { postal_code: "checkout.errors.postalCode" },
    })
    expect(wrapper.text()).toContain("Enter a postal code of 5 digits.")
    expect(wrapper.find(`${root} [name="postal_code"]`).attributes("aria-invalid")).toBe("true")
  })

  it("writes a typed value with its line breaks into the model", async () => {
    const wrapper = await mountFields({ phone: true })
    await wrapper
      .find(`${root} textarea[name="address_1"]`)
      .setValue("Jl. Melati No. 12\nRT 03/RW 05")
    expect(wrapper.emitted("update:modelValue")?.at(-1)?.[0]).toMatchObject({
      address_1: "Jl. Melati No. 12\nRT 03/RW 05",
    })
  })

  it("gives each control an id with the prefix, so two forms on one page do not collide", async () => {
    const wrapper = await mountFields({ phone: true })
    const area = wrapper.find(`${root} textarea[name="address_1"]`)
    expect(area.attributes("id")).toBe("test-address_1")
    expect(wrapper.find('label[for="test-address_1"]').exists()).toBe(true)
    expect(wrapper.find(`${root} [name="first_name"]`).attributes("autocomplete")).toBe(
      "given-name"
    )
  })
})
