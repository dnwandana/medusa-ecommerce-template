import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import CheckoutPage from "~/pages/checkout/index.vue"
import { CheckoutPaymentRows, CheckoutSummary } from "#components"

const { cart, customerState, checkout, bankTransfer, navigateToMock, addressesMock } =
  await vi.hoisted(async () => {
    const { ref } = await import("vue")
    return {
      cart: { cart: ref<unknown>(null), load: vi.fn() },
      customerState: { customer: ref<unknown>(null) },
      checkout: {
        saveContact: vi.fn(),
        loadShippingOptions: vi.fn(),
        selectShippingOption: vi.fn(),
        listPaymentProviders: vi.fn(),
        startPayment: vi.fn(),
      },
      bankTransfer: { getDetails: vi.fn() },
      navigateToMock: vi.fn(),
      addressesMock: { addresses: ref<unknown[] | null>(null), load: vi.fn(), create: vi.fn() },
    }
  })

mockNuxtImport("useCart", () => () => cart)
mockNuxtImport("useCustomer", () => () => customerState)
mockNuxtImport("useCheckout", () => () => checkout)
mockNuxtImport("useBankTransfer", () => () => bankTransfer)
mockNuxtImport("navigateTo", () => navigateToMock)
mockNuxtImport("useAddresses", () => () => addressesMock)

const valid = {
  email: "sari@example.com",
  full_name: "Sari Dewi",
  phone: "+62 812-3456-7890",
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

// Fills the email and the guest address fields with a valid address and the given values.
const fillGuest = async (wrapper: Page, overrides: Partial<typeof valid> = {}) => {
  const { email, ...address } = { ...valid, ...overrides }
  await wrapper.find("#checkout-email").setValue(email)
  for (const [name, value] of Object.entries(address)) {
    await wrapper.find(`#checkout-address-${name}`).setValue(value)
  }
}

// Fills the guest form and submits the first part.
const submitAddress = async (wrapper: Page, overrides: Partial<typeof valid> = {}) => {
  await fillGuest(wrapper, overrides)
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
  const values = {
    address_1: "Jl. Mawar 7",
    city: "Bandung",
    province: "Jawa Barat",
    postal_code: "40111",
  }
  for (const [name, value] of Object.entries(values)) {
    await wrapper.find(`[data-testid="address-fields"] [name="${name}"]`).setValue(value)
  }
  const label = wrapper.find('input[name="address_name"]')
  if (label.exists()) {
    await label.setValue("Kos")
  }
}

const BANK_TRANSFER = "pp_bank-transfer_bank-transfer"

// The answer of /store/bank-transfer with the defaults of the backend.
const details = {
  bank_accounts: [],
  contact: { email: null, whatsapp: null },
  enabled: true,
  deadline_hours: 24,
}

const payRadio = (wrapper: Page, providerId: string) =>
  wrapper.find(`[data-testid="payment-provider-${providerId}"] button[role="radio"]`)

const pay = async (wrapper: Page) => {
  await wrapper.find('[data-testid="pay"]').trigger("click")
  await flushPromises()
}

// Mounts the page as a customer with one saved address and one shipping option, and submits it.
const mountPageWithOption = async () => {
  customerState.customer.value = member
  list = [home]
  cart.cart.value = { ...(cart.cart.value as object), shipping_total: 18000, total: 318000 }
  const wrapper = await mountPage()
  await continueCheckout(wrapper)
  return wrapper
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
  checkout.listPaymentProviders.mockReset().mockResolvedValue([{ id: BANK_TRANSFER }])
  bankTransfer.getDetails.mockReset().mockResolvedValue(details)
  checkout.startPayment
    .mockReset()
    .mockResolvedValue({ type: "redirect", url: "https://pay.example.com/1" })
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

    expect(wrapper.text()).toContain("Your cart is empty")
    expect(wrapper.find("form").exists()).toBe(false)
  })

  it("shows no country text", async () => {
    const wrapper = await mountPage()

    expect(wrapper.text()).not.toContain("Country")
  })

  it("fills the email from the logged-in customer", async () => {
    customerState.customer.value = member
    const wrapper = await mountPage()

    expect((wrapper.find("#checkout-email").element as HTMLInputElement).value).toBe(
      "member@example.com"
    )
  })

  it("shows the eyebrow and the heading of the checkout", async () => {
    const wrapper = await mountPage()
    expect(wrapper.get("h1").text()).toContain("Delivery and payment")
    expect(wrapper.findAll("section h2").map((h) => h.text())).toEqual([
      "01Contact",
      "02Delivery address",
      "03Delivery method",
      "04Payment",
    ])
  })

  it("shows the email field only, with its hint", async () => {
    const wrapper = await mountPage()
    const contact = wrapper.get("[data-testid='checkout-section-1']")
    expect(contact.findAll("input")).toHaveLength(1)
    expect(contact.text()).toContain(
      "We send the order confirmation and the order status to this address."
    )
  })

  it("links a guest to the sign-in page with the checkout as the redirect", async () => {
    const wrapper = await mountPage()
    const link = wrapper.get("[data-testid='checkout-section-1'] a")
    expect(link.text()).toBe("Sign in")
    expect(link.attributes("href")).toContain("redirect=/checkout")
  })

  it("shows the waiting text in Delivery method and Payment before the address is saved", async () => {
    const wrapper = await mountPage()
    expect(wrapper.get("[data-testid='checkout-section-3']").text()).toContain(
      "Save the address to see the delivery methods."
    )
    expect(wrapper.find("[data-testid='checkout-section-4'] [role='radiogroup']").exists()).toBe(
      false
    )
    expect(wrapper.findComponent(CheckoutSummary).props("showShipping")).toBe(false)
  })

  it("saves the guest address with its own phone and pays with it", async () => {
    const wrapper = await mountPage()
    await fillGuest(wrapper, { phone: "081398765432" })
    await wrapper.get("form").trigger("submit")
    await flushPromises()
    // The cart address keeps the typed number. The payment gets the E.164 format.
    expect(checkout.saveContact).toHaveBeenCalledWith(
      "sari@example.com",
      expect.objectContaining({ phone: "081398765432", country_code: "id" })
    )
    await wrapper.get("[data-testid='pay']").trigger("click")
    await flushPromises()
    expect(checkout.startPayment.mock.calls[0]![1].phone).toBe("+6281398765432")
  })

  it("shows the total on Place order and Placing the order… while it runs", async () => {
    const wrapper = await mountPageWithOption()
    const pay = wrapper.get("[data-testid='pay']")
    expect(pay.text()).toBe("Place order · Rp 318.000")
    checkout.startPayment.mockReturnValue(new Promise(() => {}))
    await pay.trigger("click")
    expect(pay.text()).toContain("Placing the order…")
    expect(wrapper.text()).toContain(
      "By placing your order you agree to our terms of sale and privacy policy."
    )
  })

  it("shows the totals above Place order below 1024 px", async () => {
    const wrapper = await mountPageWithOption()
    const totals = wrapper.get("[data-testid='mobile-totals']")
    expect(totals.classes()).toContain("lg:hidden")
    expect(totals.text()).toContain("Rp 18.000")
    expect(totals.text()).toContain("Rp 318.000")
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

  it("splits the full name of the guest address", async () => {
    const wrapper = await mountPage()
    await submitAddress(wrapper)
    expect(checkout.saveContact).toHaveBeenCalledWith("sari@example.com", {
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

  it("shows the sign-in prompt to a guest only", async () => {
    const wrapper = await mountPage()
    expect(wrapper.text()).toContain("Have an account?")
    customerState.customer.value = member
    const signedIn = await mountPage()
    expect(signedIn.text()).not.toContain("Have an account?")
  })

  it("shows Loading shipping options… while the options load", async () => {
    checkout.loadShippingOptions.mockReturnValue(new Promise(() => {}))
    const wrapper = await mountPage()
    await submitAddress(wrapper)
    expect(wrapper.find('button[type="submit"]').text()).toContain("Loading shipping options…")
  })

  it("sends the browser to the payment page", async () => {
    const wrapper = await mountPage()
    await submitAddress(wrapper)

    await pay(wrapper)

    expect(checkout.startPayment).toHaveBeenCalledWith(BANK_TRANSFER, {
      first_name: "Sari",
      last_name: "Dewi",
      email: "sari@example.com",
      phone: "+6281234567890",
    })
    expect(navigateToMock).toHaveBeenCalledWith("https://pay.example.com/1", {
      external: true,
    })
  })

  it("lists the providers with their labels and the generic label", async () => {
    checkout.listPaymentProviders.mockResolvedValue([
      { id: BANK_TRANSFER },
      { id: "pp_unknown_unknown" },
    ])
    const wrapper = await mountPage()
    await submitAddress(wrapper)

    expect(checkout.listPaymentProviders).toHaveBeenCalledTimes(1)
    expect(wrapper.find(`[data-testid="payment-provider-${BANK_TRANSFER}"]`).text()).toContain(
      "Bank transfer"
    )
    expect(wrapper.find('[data-testid="payment-provider-pp_unknown_unknown"]').text()).toContain(
      "Online payment"
    )
  })

  it("lists the providers with the bank transfer switch of the backend", async () => {
    bankTransfer.getDetails.mockResolvedValue({ ...details, enabled: false, deadline_hours: 48 })
    const wrapper = await mountPage()
    await submitAddress(wrapper)

    expect(checkout.listPaymentProviders).toHaveBeenCalledWith({ bankTransferEnabled: false })
    expect(wrapper.findComponent(CheckoutPaymentRows).props("deadlineHours")).toBe(48)
  })

  it("shows the failed state when the bank transfer details do not load", async () => {
    bankTransfer.getDetails.mockRejectedValueOnce(new Error("down"))
    const wrapper = await mountPage()
    await submitAddress(wrapper)

    expect(checkout.listPaymentProviders).not.toHaveBeenCalled()
    expect(wrapper.find('[data-testid="payment-providers-error"]').text()).toContain(
      "An error occurred. Try again."
    )

    await wrapper.find('[data-testid="payment-providers-retry"]').trigger("click")
    await flushPromises()

    expect(bankTransfer.getDetails).toHaveBeenCalledTimes(2)
    expect(checkout.listPaymentProviders).toHaveBeenCalledTimes(1)
  })

  it("does not load the providers before the shipping option is saved", async () => {
    await mountPage()
    expect(checkout.listPaymentProviders).not.toHaveBeenCalled()
  })

  it("shows the bank transfer hint and Place order", async () => {
    const wrapper = await mountPage()
    await submitAddress(wrapper)

    expect(wrapper.text()).toContain(
      "You get the bank details after you place the order. Upload the receipt within 24 hours."
    )
    expect(wrapper.find('[data-testid="pay"]').text()).toBe("Place order · Rp 150.000")
  })

  it("names the deadline hours of the backend in the bank transfer hint", async () => {
    bankTransfer.getDetails.mockResolvedValue({ ...details, deadline_hours: 48 })
    const wrapper = await mountPage()
    await submitAddress(wrapper)

    expect(wrapper.text()).toContain("Upload the receipt within 48 hours.")
  })

  it("selects the first provider", async () => {
    checkout.listPaymentProviders.mockResolvedValue([{ id: BANK_TRANSFER }, { id: "pp_test_test" }])
    const wrapper = await mountPage()
    await submitAddress(wrapper)

    expect(payRadio(wrapper, BANK_TRANSFER).attributes("data-state")).toBe("checked")
  })

  it("shows the only provider as a selected row with no radio", async () => {
    const wrapper = await mountPage()
    await submitAddress(wrapper)

    const row = wrapper.get(`[data-testid="payment-provider-${BANK_TRANSFER}"]`)
    expect(row.attributes("data-state")).toBe("checked")
    expect(row.find('button[role="radio"]').exists()).toBe(false)
    expect(wrapper.find('[data-testid="pay"]').attributes("disabled")).toBeUndefined()
  })

  it("pays with the provider that the customer selects", async () => {
    checkout.listPaymentProviders.mockResolvedValue([{ id: BANK_TRANSFER }, { id: "pp_test_test" }])
    const wrapper = await mountPage()
    await submitAddress(wrapper)

    await payRadio(wrapper, "pp_test_test").trigger("click")
    await flushPromises()
    await pay(wrapper)

    expect(checkout.startPayment).toHaveBeenCalledTimes(1)
    expect(checkout.startPayment.mock.calls[0]![0]).toBe("pp_test_test")
  })

  it("goes to the order page after a bank transfer order", async () => {
    checkout.startPayment.mockResolvedValue({ type: "order", orderId: "order_1" })
    const wrapper = await mountPage()
    await submitAddress(wrapper)

    await pay(wrapper)

    expect(navigateToMock).toHaveBeenCalledWith("/orders/order_1")
  })

  // Review Focus: a failed cart.complete after a bank transfer session keeps the cart.
  it("shows the error and does not leave the page when the order is not placed", async () => {
    checkout.startPayment.mockRejectedValue(new Error("No stock"))
    const wrapper = await mountPage()
    await submitAddress(wrapper)

    await pay(wrapper)

    expect(wrapper.find('[data-slot="alert"][role="alert"]').text()).toBe(
      "The order was not placed. Your cart did not change. Try again."
    )
    expect(navigateToMock).not.toHaveBeenCalled()
    expect(wrapper.find('[data-testid="pay"]').attributes("disabled")).toBeUndefined()
  })

  it("shows a text and disables Place order when the region has no provider", async () => {
    checkout.listPaymentProviders.mockResolvedValue([])
    const wrapper = await mountPage()
    await submitAddress(wrapper)

    expect(wrapper.text()).toContain("This store has no payment method now. Contact the store.")
    expect(wrapper.find('[data-testid="pay"]').attributes("disabled")).toBeDefined()
  })

  it("shows an error and loads the providers again after Try again", async () => {
    checkout.listPaymentProviders.mockRejectedValueOnce(Object.assign(new Error(), { status: 500 }))
    const wrapper = await mountPage()
    await submitAddress(wrapper)

    expect(wrapper.find('[data-testid="payment-providers-error"]').text()).toContain(
      "An error occurred. Try again."
    )
    expect(wrapper.find('[data-testid="pay"]').attributes("disabled")).toBeDefined()

    await wrapper.find('[data-testid="payment-providers-retry"]').trigger("click")
    await flushPromises()

    expect(checkout.listPaymentProviders).toHaveBeenCalledTimes(2)
    expect(wrapper.find('[data-testid="pay"]').attributes("disabled")).toBeUndefined()
  })

  // Review Focus: a double click on Place order starts one payment only.
  it("starts one payment on a double click", async () => {
    checkout.startPayment.mockReturnValue(new Promise(() => {}))
    const wrapper = await mountPage()
    await submitAddress(wrapper)

    await wrapper.find('[data-testid="pay"]').trigger("click")
    await wrapper.find('[data-testid="pay"]').trigger("click")
    await flushPromises()

    expect(checkout.startPayment).toHaveBeenCalledTimes(1)
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
    checkout.startPayment.mockRejectedValue(new Error("Provider is down"))
    const wrapper = await mountPage()
    await submitAddress(wrapper)

    await pay(wrapper)

    expect(wrapper.text()).toContain(
      "The order was not placed. Your cart did not change. Try again."
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
  it("shows the only option as selected and the shipping in the summary", async () => {
    const wrapper = await mountPage()
    await submitAddress(wrapper)

    expect(wrapper.text()).not.toContain("Save the address to see the delivery methods.")
    expect(
      wrapper
        .get("[data-testid='checkout-section-3'] [data-slot='radio-row']")
        .attributes("data-state")
    ).toBe("checked")
    expect(wrapper.findComponent(CheckoutSummary).props("showShipping")).toBe(true)
  })

  it("saves the option that the customer selects in the radio group", async () => {
    checkout.loadShippingOptions.mockResolvedValue([
      { id: "so_1", name: "Standard Shipping", amount: 18000 },
      { id: "so_2", name: "Express Shipping", amount: 35000 },
    ])
    const wrapper = await mountPage()
    await submitAddress(wrapper)

    expect(wrapper.find('[data-testid="pay"]').attributes("disabled")).toBeDefined()
    await wrapper.findAll('[data-testid="checkout-section-3"] [role="radio"]')[1]!.trigger("click")
    await flushPromises()

    expect(checkout.selectShippingOption).toHaveBeenCalledWith("so_2")
    expect(wrapper.find('[data-testid="pay"]').attributes("disabled")).toBeUndefined()
  })

  it("shows the payment error in a destructive alert", async () => {
    checkout.startPayment.mockRejectedValue(new Error("Provider is down"))
    const wrapper = await mountPage()
    await submitAddress(wrapper)

    await pay(wrapper)

    expect(wrapper.find('[data-slot="alert"][role="alert"]').text()).toBe(
      "The order was not placed. Your cart did not change. Try again."
    )
  })

  it("shows the summary bar below 1024 px and the summary column of 400 px from 1024 px", async () => {
    const wrapper = await mountPage()

    expect(wrapper.find(".grid").classes()).toContain("lg:grid-cols-[minmax(0,1fr)_400px]")
    expect(wrapper.find("aside").classes()).toEqual(
      expect.arrayContaining(["hidden", "lg:block", "lg:sticky"])
    )
    expect(wrapper.find("button[aria-controls='checkout-mobile-summary']").exists()).toBe(true)
  })

  it("shows the skeleton until the cart loads", async () => {
    cart.load.mockReturnValue(new Promise(() => {}))
    const wrapper = await mountPage()
    expect(wrapper.find("[data-testid='checkout-skeleton']").attributes("role")).toBe("status")
    expect(wrapper.find("form").exists()).toBe(false)
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

  it("disables Place order after the customer selects another address", async () => {
    customerState.customer.value = member
    const wrapper = await mountPage()
    await continueCheckout(wrapper)
    await wrapper.find('[data-testid="address-option-a2"] button[role="radio"]').trigger("click")
    await flushPromises()
    expect(wrapper.find('[data-testid="pay"]').attributes("disabled")).toBeDefined()
  })

  it("pays with the profile name and the profile phone", async () => {
    customerState.customer.value = member
    const wrapper = await mountPage()
    await continueCheckout(wrapper)
    await pay(wrapper)
    expect(checkout.startPayment).toHaveBeenCalledWith(BANK_TRANSFER, {
      first_name: "Budi",
      last_name: "Santoso",
      email: "member@example.com",
      phone: "+6281298765432",
    })
  })

  it("opens the form with the profile values when there are no saved addresses", async () => {
    customerState.customer.value = member
    list = []
    const wrapper = await mountPage()
    expect(wrapper.text()).toContain("You have no saved addresses yet.")
    expect(addressField(wrapper, "full_name").value).toBe("Budi Santoso")
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
    expect(addressField(wrapper, "full_name").value).toBe("")
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
      expect.objectContaining({ address_name: "Kos", full_name: "Budi Santoso" }),
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
    expect(addressField(wrapper, "full_name").value).toBe("Budi Santoso")
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
