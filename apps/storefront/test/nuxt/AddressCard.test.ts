import { mountSuspended } from "@nuxt/test-utils/runtime"
import { describe, expect, it } from "vitest"
import { AddressCard } from "#components"

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
}
// The Medusa admin can save an address with null values.
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
}

const office = { ...home, id: "a2", address_name: "Kantor" }

const mountCard = (props: { address: object; disabled?: boolean; busy?: boolean }) =>
  mountSuspended(AddressCard, {
    props: { disabled: false, busy: false, ...props, address: props.address as never },
  })

describe("AddressCard", () => {
  it("shows the default badge, the label, and the address lines of the default card", async () => {
    const wrapper = await mountCard({ address: home })

    expect(wrapper.text()).toContain("Rumah")
    expect(wrapper.text()).toContain("Default")
    expect(wrapper.find('[data-testid="address-card-a1"]').classes()).toContain("border-foreground")
    expect(wrapper.text()).toContain("DKI Jakarta 10310")
    expect(wrapper.find('[data-testid="set-default-a1"]').exists()).toBe(false)
  })

  it("draws a hairline on top, and an ink line for the default address", async () => {
    const plain = await mountCard({ address: { ...office, is_default_shipping: false } })
    expect(plain.get("article").classes()).toContain("border-border")
    const main = await mountCard({
      address: { ...home, first_name: "Muhammad Rizky", last_name: "Pratama" },
    })
    expect(main.get("article").classes()).toContain("border-foreground")
    expect(main.text()).toContain("Muhammad Rizky Pratama")
    expect(main.text()).toContain("Default")
  })

  it("keeps the line breaks of address_1", async () => {
    const wrapper = await mountCard({ address: home })

    const street = wrapper.find(".whitespace-pre-line")
    expect(street.text()).toBe("Jl. Melati No. 12\nRT 03/RW 05")
  })

  it("shows Address as the title and no null text for an address from the admin", async () => {
    const wrapper = await mountCard({ address: fromAdmin })

    expect(wrapper.text()).toContain("Address")
    expect(wrapper.text()).not.toContain("null")
    expect(wrapper.find('[data-testid="address-card-a9"]').classes()).not.toContain(
      "border-foreground"
    )
    expect(wrapper.find('[data-testid="set-default-a9"]').exists()).toBe(true)
  })

  it("emits the three actions", async () => {
    const wrapper = await mountCard({ address: fromAdmin })

    await wrapper.find('[data-testid="edit-a9"]').trigger("click")
    await wrapper.find('[data-testid="set-default-a9"]').trigger("click")
    await wrapper.find('[data-testid="delete-a9"]').trigger("click")

    expect(Object.keys(wrapper.emitted())).toEqual(
      expect.arrayContaining(["edit", "setDefault", "remove"])
    )
  })

  it("disables the actions and shows Saving… on the busy card", async () => {
    const wrapper = await mountCard({ address: fromAdmin, disabled: true, busy: true })

    expect(wrapper.find('[data-testid="edit-a9"]').attributes("disabled")).toBeDefined()
    expect(wrapper.find('[data-testid="set-default-a9"]').attributes("disabled")).toBeDefined()
    expect(wrapper.find('[data-testid="delete-a9"]').attributes("disabled")).toBeDefined()
    expect(wrapper.find('[data-testid="set-default-a9"]').text()).toContain("Saving…")
  })

  it("shows Set as default on a card that is not busy", async () => {
    const wrapper = await mountCard({ address: fromAdmin, disabled: true })

    expect(wrapper.find('[data-testid="set-default-a9"]').text()).toContain("Set as default")
  })
})
