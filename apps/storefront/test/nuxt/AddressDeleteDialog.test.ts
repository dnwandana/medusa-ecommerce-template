import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { AddressDeleteDialog } from "#components"

const { addresses } = vi.hoisted(() => ({ addresses: { remove: vi.fn() } }))

mockNuxtImport("useAddresses", () => () => addresses)

const home = {
  id: "a1",
  address_name: "Rumah",
  is_default_shipping: true,
  first_name: "Sari",
  last_name: "Dewi",
  address_1: "Jl. Melati No. 12\nRT 03/RW 05",
  city: "Jakarta Pusat",
  province: "DKI Jakarta",
  postal_code: "10310",
}
const office = { ...home, id: "a2", address_name: "Kantor", is_default_shipping: false }

const mountDialog = async (props: { address: object; addresses: object[] }) => {
  const wrapper = await mountSuspended(AddressDeleteDialog, {
    props: { open: true, address: props.address as never, addresses: props.addresses as never },
    attachTo: document.body,
  })
  await flushPromises()
  return wrapper
}

// The dialog content is in a portal, so the tests find the buttons in document.body.
const confirmButton = () =>
  document.body.querySelector<HTMLButtonElement>('[data-testid="delete-confirm"]')!
const cancelButton = () =>
  document.body.querySelector<HTMLButtonElement>('[data-testid="delete-cancel"]')!

const confirm = async () => {
  confirmButton().click()
  await flushPromises()
}

beforeEach(() => {
  addresses.remove.mockReset().mockResolvedValue(undefined)
})

afterEach(() => {
  document.body.innerHTML = ""
})

describe("AddressDeleteDialog", () => {
  it("shows the summary of the address on one line and the warning", async () => {
    await mountDialog({ address: office, addresses: [home, office] })
    const text = document.body.textContent
    expect(text).toContain("Delete this address?")
    expect(text).toContain("Kantor")
    expect(text).toContain("Sari Dewi")
    expect(text).toContain("Jl. Melati No. 12, RT 03/RW 05, Jakarta Pusat, DKI Jakarta 10310")
    expect(text).toContain("You cannot undo this. Past orders keep their address.")
    expect(document.body.querySelector('[data-testid="delete-new-default"]')).toBeNull()
    expect(document.body.querySelector('[data-testid="delete-only"]')).toBeNull()
  })

  it("names the next default address when the default address is deleted", async () => {
    await mountDialog({ address: home, addresses: [home, office] })
    expect(
      document.body.querySelector('[data-testid="delete-new-default"]')?.textContent
    ).toContain("Kantor becomes your new default address.")
  })

  it("uses the untitled text for a next default address with no label", async () => {
    await mountDialog({ address: home, addresses: [home, { ...office, address_name: null }] })
    expect(
      document.body.querySelector('[data-testid="delete-new-default"]')?.textContent
    ).toContain("Address becomes your new default address.")
  })

  it("warns that the only address leaves no saved address", async () => {
    await mountDialog({ address: home, addresses: [home] })
    expect(document.body.querySelector('[data-testid="delete-only"]')?.textContent).toContain(
      "This is your only address. After you delete it, you have no saved addresses."
    )
    expect(document.body.querySelector('[data-testid="delete-new-default"]')).toBeNull()
  })

  it("shows Deleting… and disables Cancel during the request", async () => {
    addresses.remove.mockReturnValue(new Promise(() => {}))
    const wrapper = await mountDialog({ address: office, addresses: [home, office] })
    await confirm()
    expect(document.body.textContent).toContain("Deleting…")
    expect(cancelButton().hasAttribute("disabled")).toBe(true)
    expect(confirmButton().hasAttribute("disabled")).toBe(true)
    expect(wrapper.emitted("update:open")).toBeUndefined()
  })

  it("deletes the address, emits deleted, and closes", async () => {
    const wrapper = await mountDialog({ address: office, addresses: [home, office] })
    await confirm()
    expect(addresses.remove).toHaveBeenCalledWith("a2")
    expect(wrapper.emitted("deleted")).toHaveLength(1)
    expect(wrapper.emitted("update:open")?.at(-1)).toEqual([false])
  })

  it("stays open with an alert when the delete fails", async () => {
    addresses.remove.mockRejectedValue(Object.assign(new Error(), { status: 500 }))
    const wrapper = await mountDialog({ address: office, addresses: [home, office] })
    await confirm()
    expect(document.body.querySelector('[role="alert"]')?.textContent).toContain(
      "The address was not deleted. Try again."
    )
    expect(wrapper.emitted("deleted")).toBeUndefined()
    expect(wrapper.emitted("update:open")).toBeUndefined()
    expect(cancelButton().hasAttribute("disabled")).toBe(false)
  })

  it("clears the error alert when the dialog opens again", async () => {
    addresses.remove.mockRejectedValue(Object.assign(new Error(), { status: 500 }))
    const wrapper = await mountDialog({ address: office, addresses: [home, office] })
    await confirm()
    await wrapper.setProps({ open: false })
    await wrapper.setProps({ open: true })
    await flushPromises()
    expect(document.body.querySelector('[role="alert"]')).toBeNull()
  })

  it("uses a bottom sheet on a phone", async () => {
    await mountDialog({ address: office, addresses: [home, office] })
    const content = document.body.querySelector('[role="alertdialog"]')
    expect(content?.className).toContain("bottom-0")
    expect(content?.className).toContain("md:top-1/2")
  })
})
