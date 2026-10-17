import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import CheckoutPage from "~/pages/checkout/index.vue"
import { CheckoutStepper, CheckoutSummary } from "#components"

const { cart, customerState, checkout, navigateToMock, addressesMock } = await vi.hoisted(
  async () => {
    const { ref } = await import("vue")
    return {
      cart: { cart: ref<unknown>(null), load: vi.fn() },
      customerState: { customer: ref<unknown>(null) },
      checkout: {
        saveContact: vi.fn(),
        loadShippingOptions: vi.fn(),
        selectShippingOption: vi.fn(),
        startPayment: vi.fn(),
      },
      navigateToMock: vi.fn(),
      addressesMock: { addresses: ref<unknown[] | null>(null), load: vi.fn(), create: vi.fn() },
    }
  }
)

mockNuxtImport("useCart", () => () => cart)
mockNuxtImport("useCustomer", () => () => customerState)
mockNuxtImport("useCheckout", () => () => checkout)
mockNuxtImport("navigateTo", () => navigateToMock)
mockNuxtImport("useAddresses", () => () => addressesMock)

const valid = {
  email: "buyer@example.com",
  phone: "+62 812-3456-7890",
  first_name: "Sari",
  last_name: "Dewi",
  address_1: "Jl. Merdeka No. 1",
  city: "Bandung",
  province: "Jawa Barat",
  postal_code: "40111",
}

const member = {
  email: "member@example.com",
  first_name: "Budi",
  last_name: "Santoso",
  phone: "081298765432",
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
}
const office = { ...home, id: "a2", address_name: "Kantor", is_default_shipping: false }
const fromAdmin = {
  ...home,
  id: "a9",
  address_name: null,
  is_default_shipping: false,
  phone: null,
  province: null,
  postal_code: null,
}

// The address that create() returns.
const created = {
  ...home,
  id: "a5",
  address_name: "Kos",
  is_default_shipping: false,
  address_1: "Jl. Mawar 7",
}

// The saved addresses that the next load() writes to the state.
let list: unknown[] = []

type Page = Awaited<ReturnType<typeof mountSuspended>>

const wrappers: Page[] = []

const mountPage = async () => {
  const wrapper = await mountSuspended(CheckoutPage)
  wrappers.push(wrapper)
  await flushPromises()
  return wrapper
}

// Unmount first. The beforeEach changes the shared customer ref, and the watch of a page that is
// still mounted then loads the saved addresses again.
afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount())
})

const CONTACT_FIELDS = ["email", "phone"]

// Fills the form and submits the first part. The Contact card and the address fields can have a
// control with the same name, so the address values go into the address fields only.
const submitAddress = async (wrapper: Page, overrides: Partial<typeof valid> = {}) => {
  for (const [name, value] of Object.entries({ ...valid, ...overrides })) {
    const selector = CONTACT_FIELDS.includes(name)
      ? `input[name="${name}"]`
      : `[data-testid="address-fields"] [name="${name}"]`
    await wrapper.find(selector).setValue(value)
  }
  await wrapper.find("form").trigger("submit")
  await flushPromises()
}

// Submits the form. The Contact card already has the values of the logged-in customer.
const continueCheckout = async (wrapper: Page) => {
  await wrapper.find("form").trigger("submit")
  await flushPromises()
}

const addressField = (wrapper: Page, name: string) =>
  wrapper.find(`[data-testid="address-fields"] [name="${name}"]`).element as HTMLInputElement

const selectNewAddress = async (wrapper: Page) => {
  await wrapper.find('[data-testid="address-option-new"] button[role="radio"]').trigger("click")
  await flushPromises()
}

// Types a valid address. The name and the phone come from the profile. The Label field shows only
// when "Save this address" shows and is on.
const fillAddress = async (wrapper: Page) => {
  const values = { address_1: "Jl. Mawar 7", city: "Bandung", postal_code: "40111" }
  for (const [name, value] of Object.entries(values)) {
    await wrapper.find(`[data-testid="address-fields"] [name="${name}"]`).setValue(value)
  }
  const label = wrapper.find('input[name="address_name"]')
  if (label.exists()) {
    await label.setValue("Kos")
  }
}

const pay = async (wrapper: Page) => {
  await wrapper.find('[data-testid="pay"]').trigger("click")
  await flushPromises()
}

beforeEach(() => {
  cart.cart.value = {
    id: "cart_1",
    items: [{ id: "item_1" }],
    item_subtotal: 150000,
    total: 150000,
  }
  cart.load.mockReset().mockResolvedValue(undefined)
  customerState.customer.value = null
  checkout.saveContact.mockReset().mockResolvedValue(undefined)
  checkout.loadShippingOptions
    .mockReset()
    .mockResolvedValue([{ id: "so_1", name: "Standard Shipping", amount: 18000 }])
  checkout.selectShippingOption.mockReset().mockResolvedValue(undefined)
  checkout.startPayment.mockReset().mockResolvedValue("https://pay.mayar.example/invoice-1")
  navigateToMock.mockReset()
  list = [home, office]
  addressesMock.addresses.value = null
  addressesMock.load.mockReset().mockImplementation(async () => {
    addressesMock.addresses.value = list
  })
  addressesMock.create.mockReset().mockImplementation(async () => {
    addressesMock.addresses.value = [...(addressesMock.addresses.value ?? []), created]
    return created
  })
})

describe("checkout page", () => {
  it("shows the empty text and no form for an empty cart", async () => {
    cart.cart.value = null
    const wrapper = await mountPage()

    expect(wrapper.text()).toContain("Your cart is empty.")
    expect(wrapper.find("form").exists()).toBe(false)
  })

  it("shows no country text", async () => {
    const wrapper = await mountPage()

    expect(wrapper.text()).not.toContain("Country")
  })

  it("fills the contact fields from the logged-in customer", async () => {
    customerState.customer.value = {
      email: "member@example.com",
      first_name: "Budi",
      last_name: "Santoso",
      phone: "081298765432",
    }
    const wrapper = await mountPage()

    expect((wrapper.find('input[name="email"]').element as HTMLInputElement).value).toBe(
      "member@example.com"
    )
    expect((wrapper.find('input[name="phone"]').element as HTMLInputElement).value).toBe(
      "081298765432"
    )
  })

  it("shows the field error and saves nothing for a wrong phone number", async () => {
    const wrapper = await mountPage()

    await submitAddress(wrapper, { phone: "08abc" })

    expect(wrapper.text()).toContain("Enter a valid Indonesian mobile number")
    expect(checkout.saveContact).not.toHaveBeenCalled()
    expect(wrapper.find('[data-testid="pay"]').attributes("disabled")).toBeDefined()
  })

  it("saves the address, shows the shipping amount, and selects the only option", async () => {
    const wrapper = await mountPage()

    await submitAddress(wrapper)

    expect(checkout.saveContact).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain("Standard Shipping")
    expect(wrapper.text()).toContain("Rp 18.000")
    expect(checkout.selectShippingOption).toHaveBeenCalledWith("so_1")
    expect(wrapper.find('[data-testid="pay"]').attributes("disabled")).toBeUndefined()
  })

  it("saves the guest address with the contact phone", async () => {
    const wrapper = await mountPage()
    await submitAddress(wrapper)
    expect(checkout.saveContact).toHaveBeenCalledWith("buyer@example.com", {
      first_name: "Sari",
      last_name: "Dewi",
      address_1: "Jl. Merdeka No. 1",
      city: "Bandung",
      province: "Jawa Barat",
      postal_code: "40111",
      country_code: "id",
      phone: "+6281234567890",
    })
  })

  it("shows the address as a textarea and no phone field in the address fields of a guest", async () => {
    const wrapper = await mountPage()
    expect(wrapper.find('[data-testid="address-fields"] textarea[name="address_1"]').exists()).toBe(
      true
    )
    expect(wrapper.find('[data-testid="address-fields"] [name="phone"]').exists()).toBe(false)
  })

  it("shows the login link to a guest", async () => {
    const wrapper = await mountPage()
    expect(wrapper.text()).toContain("Have an account?")
    expect(wrapper.find('a[href="/account/login?redirect=/checkout"]').text()).toBe(
      "Log in to use your saved addresses."
    )
  })

  it("shows Loading shipping options… while the options load", async () => {
    checkout.loadShippingOptions.mockReturnValue(new Promise(() => {}))
    const wrapper = await mountPage()
    await submitAddress(wrapper)
    expect(wrapper.find('button[type="submit"]').text()).toContain("Loading shipping options…")
  })

  it("sends the browser to the Mayar payment page", async () => {
    const wrapper = await mountPage()
    await submitAddress(wrapper)

    await pay(wrapper)

    expect(checkout.startPayment).toHaveBeenCalledWith({
      name: "Sari Dewi",
      email: "buyer@example.com",
      mobile: "+6281234567890",
    })
    expect(navigateToMock).toHaveBeenCalledWith("https://pay.mayar.example/invoice-1", {
      external: true,
    })
  })

  it("does not pay with a field that changed after the address was saved", async () => {
    const wrapper = await mountPage()
    await submitAddress(wrapper)

    await wrapper.find('input[name="phone"]').setValue("08abc")
    await flushPromises()
    await pay(wrapper)

    expect(checkout.startPayment).not.toHaveBeenCalled()
    expect(wrapper.find('[data-testid="pay"]').attributes("disabled")).toBeDefined()
  })

  it("shows an error and stays on the page when the payment does not start", async () => {
    checkout.startPayment.mockRejectedValue(new Error("Mayar is down"))
    const wrapper = await mountPage()
    await submitAddress(wrapper)

    await pay(wrapper)

    expect(wrapper.text()).toContain(
      "The payment page is not available. Your cart did not change. Try again."
    )
    expect(navigateToMock).not.toHaveBeenCalled()
    expect(wrapper.find('[data-testid="pay"]').attributes("disabled")).toBeUndefined()
  })

  it("shows an error when the address is not saved", async () => {
    checkout.saveContact.mockRejectedValue(new Error("HTTP 500"))
    const wrapper = await mountPage()

    await submitAddress(wrapper)

    expect(wrapper.text()).toContain("The address was not saved. Try again.")
    expect(checkout.loadShippingOptions).not.toHaveBeenCalled()
  })
  it("shows step 1 and the shipping hint before the address is saved", async () => {
    const wrapper = await mountPage()

    expect(wrapper.findComponent(CheckoutStepper).props("current")).toBe(1)
    expect(wrapper.text()).toContain("Save the address to see the shipping options.")
    expect(wrapper.findComponent(CheckoutSummary).props("showShipping")).toBe(false)
  })

  it("shows step 3, the selected radio, and the shipping in the summary after the only option", async () => {
    const wrapper = await mountPage()
    await submitAddress(wrapper)

    expect(wrapper.findComponent(CheckoutStepper).props("current")).toBe(3)
    expect(wrapper.text()).not.toContain("Save the address to see the shipping options.")
    expect(wrapper.find('[role="radio"][aria-checked="true"]').exists()).toBe(true)
    expect(wrapper.findComponent(CheckoutSummary).props("showShipping")).toBe(true)
  })

  it("saves the option that the customer selects in the radio group", async () => {
    checkout.loadShippingOptions.mockResolvedValue([
      { id: "so_1", name: "Standard Shipping", amount: 18000 },
      { id: "so_2", name: "Express Shipping", amount: 35000 },
    ])
    const wrapper = await mountPage()
    await submitAddress(wrapper)

    expect(wrapper.findComponent(CheckoutStepper).props("current")).toBe(2)
    await wrapper.findAll('[role="radio"]')[1]!.trigger("click")
    await flushPromises()

    expect(checkout.selectShippingOption).toHaveBeenCalledWith("so_2")
    expect(wrapper.find('[data-testid="pay"]').attributes("disabled")).toBeUndefined()
  })

  it("shows the payment error in a destructive alert", async () => {
    checkout.startPayment.mockRejectedValue(new Error("Mayar is down"))
    const wrapper = await mountPage()
    await submitAddress(wrapper)

    await pay(wrapper)

    expect(wrapper.find('[data-slot="alert"][role="alert"]').text()).toBe(
      "The payment page is not available. Your cart did not change. Try again."
    )
  })

  it("puts the summary above the form below md and in a column of 400px from md", async () => {
    const wrapper = await mountPage()

    expect(wrapper.find(".grid").classes()).toContain("md:grid-cols-[minmax(0,1fr)_400px]")
    expect(wrapper.find("aside").classes()).toEqual(
      expect.arrayContaining(["order-first", "md:order-none", "md:sticky"])
    )
  })

  it("does not load the saved addresses for a guest", async () => {
    await mountPage()
    expect(addressesMock.load).not.toHaveBeenCalled()
  })

  it("loads the saved addresses and selects the default address", async () => {
    customerState.customer.value = member
    const wrapper = await mountPage()
    expect(addressesMock.load).toHaveBeenCalledTimes(1)
    expect(
      wrapper
        .find('[data-testid="address-option-a1"] button[role="radio"]')
        .attributes("data-state")
    ).toBe("checked")
    expect(wrapper.find('[data-testid="address-fields"]').exists()).toBe(false)
  })

  it("disables Continue while the saved addresses load", async () => {
    customerState.customer.value = member
    addressesMock.load.mockReturnValue(new Promise(() => {}))
    const wrapper = await mountPage()
    expect(wrapper.find('button[type="submit"]').attributes("disabled")).toBeDefined()
  })

  it("writes the selected saved address on one line with its own phone to the cart", async () => {
    customerState.customer.value = member
    const wrapper = await mountPage()
    await continueCheckout(wrapper)
    expect(checkout.saveContact).toHaveBeenCalledWith("member@example.com", {
      first_name: "Sari",
      last_name: "Dewi",
      address_1: "Jl. Melati No. 12, RT 03/RW 05",
      city: "Jakarta Pusat",
      province: "DKI Jakarta",
      postal_code: "10310",
      country_code: "id",
      phone: "081234567890",
    })
  })

  // Review Focus: an address from the admin with null fields.
  it("stops with an alert and a link for a saved address that is not complete", async () => {
    customerState.customer.value = member
    list = [fromAdmin]
    const wrapper = await mountPage()
    await continueCheckout(wrapper)
    expect(wrapper.find('[data-testid="invalid-address"]').text()).toContain(
      "This saved address is not complete. Update it on the Addresses page."
    )
    expect(wrapper.find('[data-testid="invalid-address"] a').attributes("href")).toBe(
      "/account/addresses"
    )
    expect(checkout.saveContact).not.toHaveBeenCalled()
  })

  it("hides the alert for a saved address that is not complete after another selection", async () => {
    customerState.customer.value = member
    list = [fromAdmin, office]
    const wrapper = await mountPage()
    await continueCheckout(wrapper)
    await wrapper.find('[data-testid="address-option-a2"] button[role="radio"]').trigger("click")
    await flushPromises()
    expect(wrapper.find('[data-testid="invalid-address"]').exists()).toBe(false)
  })

  it("disables Pay after the customer selects another address", async () => {
    customerState.customer.value = member
    const wrapper = await mountPage()
    await continueCheckout(wrapper)
    await wrapper.find('[data-testid="address-option-a2"] button[role="radio"]').trigger("click")
    await flushPromises()
    expect(wrapper.find('[data-testid="pay"]').attributes("disabled")).toBeDefined()
  })

  it("pays with the profile name and the contact phone", async () => {
    customerState.customer.value = member
    const wrapper = await mountPage()
    await continueCheckout(wrapper)
    await pay(wrapper)
    expect(checkout.startPayment).toHaveBeenCalledWith({
      name: "Budi Santoso",
      email: "member@example.com",
      mobile: "081298765432",
    })
  })

  it("opens the form with the profile values when there are no saved addresses", async () => {
    customerState.customer.value = member
    list = []
    const wrapper = await mountPage()
    expect(wrapper.text()).toContain("You have no saved addresses yet.")
    expect(addressField(wrapper, "first_name").value).toBe("Budi")
    expect(addressField(wrapper, "phone").value).toBe("081298765432")
    expect(addressField(wrapper, "address_1").value).toBe("")
  })

  // Review Focus: a profile with no name and no phone.
  it("leaves the name and the phone empty for a profile with no name and no phone", async () => {
    customerState.customer.value = {
      email: "member@example.com",
      first_name: null,
      last_name: null,
      phone: null,
    }
    list = []
    const wrapper = await mountPage()
    expect(addressField(wrapper, "first_name").value).toBe("")
    expect(addressField(wrapper, "phone").value).toBe("")
  })

  it("shows the form after a failed load and loads again after Try again", async () => {
    customerState.customer.value = member
    addressesMock.load.mockRejectedValueOnce(Object.assign(new Error(), { status: 500 }))
    const wrapper = await mountPage()
    expect(wrapper.find('[data-testid="address-fields"]').exists()).toBe(true)
    await wrapper.find('[data-testid="address-retry"]').trigger("click")
    await flushPromises()
    expect(addressesMock.load).toHaveBeenCalledTimes(2)
    expect(wrapper.find('[data-testid="address-option-a1"]').exists()).toBe(true)
  })

  it("has no duplicate ids for a logged-in customer with the new address form open", async () => {
    customerState.customer.value = member
    const wrapper = await mountPage()
    await wrapper.find('[data-testid="address-option-new"] button[role="radio"]').trigger("click")
    await flushPromises()
    expect(wrapper.find('[data-testid="address-fields"] [name="phone"]').exists()).toBe(true)
    const ids = wrapper.findAll("[id]").map((element) => element.attributes("id"))
    expect(ids.filter((id, index) => ids.indexOf(id) !== index)).toEqual([])
  })

  it("saves the new address, selects it, and writes it to the cart", async () => {
    customerState.customer.value = member
    const wrapper = await mountPage()
    await selectNewAddress(wrapper)
    await fillAddress(wrapper)
    await continueCheckout(wrapper)
    expect(addressesMock.create).toHaveBeenCalledWith(
      expect.objectContaining({ address_name: "Kos", first_name: "Budi" }),
      false
    )
    expect(
      wrapper
        .find('[data-testid="address-option-a5"] button[role="radio"]')
        .attributes("data-state")
    ).toBe("checked")
    expect(wrapper.find('[data-testid="address-saved"]').text()).toBe(
      'The address is saved to your account as "Kos".'
    )
    expect(checkout.saveContact).toHaveBeenCalledWith(
      "member@example.com",
      expect.objectContaining({ address_1: "Jl. Mawar 7" })
    )
    expect(wrapper.find('[data-testid="pay"]').attributes("disabled")).toBeUndefined()
  })

  it("closes the form and resets it to the profile values after the save", async () => {
    customerState.customer.value = member
    const wrapper = await mountPage()
    await selectNewAddress(wrapper)
    await fillAddress(wrapper)
    await wrapper.find('[data-testid="make-default"]').trigger("click")
    await continueCheckout(wrapper)
    expect(wrapper.find('[data-testid="address-fields"]').exists()).toBe(false)

    await selectNewAddress(wrapper)
    expect(addressField(wrapper, "first_name").value).toBe("Budi")
    expect(addressField(wrapper, "address_1").value).toBe("")
    expect(wrapper.find('[data-testid="save-address"]').attributes("data-state")).toBe("checked")
    expect(wrapper.find('[data-testid="make-default"]').attributes("data-state")).toBe("unchecked")
    expect(wrapper.find('[data-testid="address-saved"]').exists()).toBe(false)
  })

  it("saves the first address as the default address and shows the list after the save", async () => {
    customerState.customer.value = member
    list = []
    const wrapper = await mountPage()
    await fillAddress(wrapper)
    await continueCheckout(wrapper)
    expect(addressesMock.create).toHaveBeenCalledWith(expect.anything(), true)
    expect(wrapper.find('[data-testid="address-option-a5"]').exists()).toBe(true)
  })

  it("sends the default flag when Use as my default shipping address is on", async () => {
    customerState.customer.value = member
    const wrapper = await mountPage()
    await selectNewAddress(wrapper)
    await fillAddress(wrapper)
    await wrapper.find('[data-testid="make-default"]').trigger("click")
    await continueCheckout(wrapper)
    expect(addressesMock.create).toHaveBeenCalledWith(expect.anything(), true)
  })

  it("does not save the address when Save this address is off", async () => {
    customerState.customer.value = member
    const wrapper = await mountPage()
    await selectNewAddress(wrapper)
    await fillAddress(wrapper)
    await wrapper.find('[data-testid="save-address"]').trigger("click")
    await continueCheckout(wrapper)
    expect(addressesMock.create).not.toHaveBeenCalled()
    expect(checkout.saveContact).toHaveBeenCalledTimes(1)
  })

  it("warns, keeps the form, and still writes the typed address when the save fails", async () => {
    customerState.customer.value = member
    addressesMock.create.mockRejectedValue(Object.assign(new Error(), { status: 500 }))
    const wrapper = await mountPage()
    await selectNewAddress(wrapper)
    await fillAddress(wrapper)
    await continueCheckout(wrapper)
    expect(wrapper.find('[data-testid="address-not-saved"]').text()).toContain(
      "The address was not saved to your account. Your order still ships to this address."
    )
    expect((wrapper.find('input[name="address_name"]').element as HTMLInputElement).value).toBe(
      "Kos"
    )
    expect(checkout.saveContact).toHaveBeenCalledTimes(1)
  })

  it("hides the warning after another selection", async () => {
    customerState.customer.value = member
    addressesMock.create.mockRejectedValue(Object.assign(new Error(), { status: 500 }))
    const wrapper = await mountPage()
    await selectNewAddress(wrapper)
    await fillAddress(wrapper)
    await continueCheckout(wrapper)
    await wrapper.find('[data-testid="address-option-a1"] button[role="radio"]').trigger("click")
    await flushPromises()
    expect(wrapper.find('[data-testid="address-not-saved"]').exists()).toBe(false)
  })

  // Review Focus: a double click creates one address only.
  it("shows Saving the address… and creates one address on a double click", async () => {
    customerState.customer.value = member
    addressesMock.create.mockReturnValue(new Promise(() => {}))
    const wrapper = await mountPage()
    await selectNewAddress(wrapper)
    await fillAddress(wrapper)
    await wrapper.find("form").trigger("submit")
    await wrapper.find("form").trigger("submit")
    await flushPromises()
    expect(wrapper.find('button[type="submit"]').text()).toContain("Saving the address…")
    expect(addressesMock.create).toHaveBeenCalledTimes(1)
  })

  it("does not save the address after a failed load", async () => {
    customerState.customer.value = member
    addressesMock.load.mockRejectedValue(Object.assign(new Error(), { status: 500 }))
    const wrapper = await mountPage()
    await fillAddress(wrapper)
    await continueCheckout(wrapper)
    expect(addressesMock.create).not.toHaveBeenCalled()
    expect(checkout.saveContact).toHaveBeenCalledTimes(1)
  })
})
