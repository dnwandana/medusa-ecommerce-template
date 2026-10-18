import type { HttpTypes } from "@medusajs/types"
import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { AddressDialog } from "#components"

const { addresses } = vi.hoisted(() => ({
  addresses: { create: vi.fn(), update: vi.fn() },
}))

mockNuxtImport("useAddresses", () => () => addresses)

type Dialog = Awaited<ReturnType<typeof mountSuspended<typeof AddressDialog>>>

const valid = {
  full_name: "Sari Dewi",
  phone: "081234567890",
  address_1: "Jl. Melati No. 12",
  city: "Jakarta Pusat",
  province: "DKI Jakarta",
  postal_code: "10310",
}
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
} as unknown as HttpTypes.StoreCustomerAddress

// Mounts the dialog open, as a parent with v-model:open does, so a close goes back into the prop.
// The dialog content is in a portal, so the tests query document.body.
async function mountDialog(props: {
  address: HttpTypes.StoreCustomerAddress | null
  first: boolean
}): Promise<Dialog> {
  const wrapper: Dialog = await mountSuspended(AddressDialog, {
    attachTo: document.body,
    props: {
      ...props,
      open: true,
      "onUpdate:open": (value: boolean) => wrapper.setProps({ open: value }),
    },
  })
  await flushPromises()
  return wrapper
}

// The Contact card at checkout also has name="phone", so the query starts at the address fields.
function field(name: string): HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement {
  const control = document.body.querySelector<
    HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
  >(`[data-testid="address-fields"] [name="${name}"]`)
  if (!control) {
    throw new Error(`The address field "${name}" is not in the dialog.`)
  }
  return control
}

async function fill(values: Record<string, string>): Promise<void> {
  for (const [name, value] of Object.entries(values)) {
    const control = field(name)
    control.value = value
    // A select updates its model on "change". The other controls update on "input".
    control.dispatchEvent(new Event(control instanceof HTMLSelectElement ? "change" : "input"))
  }
  await flushPromises()
}

function saveButton(): HTMLButtonElement {
  return document.body.querySelector<HTMLButtonElement>('[data-testid="address-save"]')!
}

// reka-ui renders the checkbox root as a fragment, so find the control by its role.
function checkbox(): HTMLElement {
  return document.body.querySelector<HTMLElement>(
    '[data-testid="address-default"] [role="checkbox"]'
  )!
}

async function submit(): Promise<void> {
  saveButton().click()
  await flushPromises()
}

beforeEach(() => {
  addresses.create.mockReset().mockResolvedValue({ id: "a2" })
  addresses.update.mockReset().mockResolvedValue(undefined)
})

afterEach(() => {
  document.body.innerHTML = ""
})

describe("AddressDialog", () => {
  it("shows the field errors and saves nothing for an empty form", async () => {
    await mountDialog({ address: null, first: false })
    await submit()
    expect(document.body.textContent).toContain("Fill in this field.")
    expect(document.body.textContent).toContain("Select a province.")
    expect(document.querySelector("#address-dialog-full_name")!.getAttribute("aria-invalid")).toBe(
      "true"
    )
    expect(addresses.create).not.toHaveBeenCalled()
    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull()
  })

  it("uses the dialog style of the store and no own size classes", async () => {
    await mountDialog({ address: null, first: false })
    const content = document.querySelector("[data-slot='dialog-content']")!
    expect(content.className).not.toContain("md:max-w-[520px]")
    expect(content.className).not.toContain("rounded-xl")
  })

  it("locks the default checkbox for the first address and saves it as the default", async () => {
    await mountDialog({ address: null, first: true })
    expect(checkbox().getAttribute("data-state")).toBe("checked")
    expect(checkbox().hasAttribute("disabled")).toBe(true)
    expect(document.body.textContent).toContain(
      "Your first address is always your default address."
    )
    await fill(valid)
    await submit()
    expect(addresses.create).toHaveBeenCalledWith(
      expect.objectContaining({ full_name: "Sari Dewi" }),
      true
    )
  })

  it("leaves the default checkbox free and off for a later address", async () => {
    await mountDialog({ address: null, first: false })
    expect(checkbox().getAttribute("data-state")).toBe("unchecked")
    expect(checkbox().hasAttribute("disabled")).toBe(false)
    // The Label field is outside AddressFields, so the test types into it here.
    const label = document.body.querySelector<HTMLInputElement>('[name="address_name"]')!
    label.value = "Kantor"
    label.dispatchEvent(new Event("input"))
    await fill(valid)
    await submit()
    expect(addresses.create).toHaveBeenCalledWith(
      expect.objectContaining({ address_name: "Kantor", full_name: "Sari Dewi" }),
      false
    )
  })

  it("shows the spinner text, disables the button, and creates one address on a double click", async () => {
    addresses.create.mockReturnValue(new Promise(() => {}))
    await mountDialog({ address: null, first: false })
    await fill(valid)
    await submit()
    await submit()
    expect(document.body.textContent).toContain("Saving…")
    expect(saveButton().hasAttribute("disabled")).toBe(true)
    expect(addresses.create).toHaveBeenCalledTimes(1)
  })

  it("does not close on Escape during the save", async () => {
    addresses.create.mockReturnValue(new Promise(() => {}))
    const wrapper = await mountDialog({ address: null, first: false })
    await fill(valid)
    await submit()
    document.body
      .querySelector('[role="dialog"]')!
      .dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))
    await flushPromises()
    expect(wrapper.emitted("update:open")).toBeUndefined()
    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull()
  })

  it("emits added and closes after a successful save", async () => {
    const wrapper = await mountDialog({ address: null, first: false })
    await fill(valid)
    await submit()
    expect(wrapper.emitted("saved")?.[0]).toEqual(["added"])
    expect(wrapper.emitted("update:open")?.at(-1)).toEqual([false])
  })

  it("stays open with the values and an alert after a server error", async () => {
    addresses.create.mockRejectedValue(Object.assign(new Error(), { status: 500 }))
    await mountDialog({ address: null, first: false })
    await fill(valid)
    await submit()
    expect(document.body.querySelector('[role="alert"]')?.textContent).toContain(
      "The address was not saved. Check your connection, then try again."
    )
    expect(field("full_name").value).toBe("Sari Dewi")
  })

  it("edits the address with its values, the subtitle, and a locked default checkbox", async () => {
    const wrapper = await mountDialog({ address: home, first: false })
    expect(document.body.textContent).toContain("Edit address")
    expect(document.body.textContent).toContain(
      "Changes apply to your next orders. Past orders keep their address."
    )
    expect(field("address_1").value).toBe("Jl. Melati No. 12\nRT 03/RW 05")
    expect(checkbox().hasAttribute("disabled")).toBe(true)
    await submit()
    expect(addresses.update).toHaveBeenCalledWith(
      "a1",
      expect.objectContaining({ address_name: "Rumah" }),
      true
    )
    expect(wrapper.emitted("saved")?.[0]).toEqual(["updated"])
  })
})
