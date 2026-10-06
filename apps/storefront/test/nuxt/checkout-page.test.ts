import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import CheckoutPage from "~/pages/checkout/index.vue"
import { CheckoutStepper, CheckoutSummary } from "#components"

const { cart, customerState, checkout, navigateToMock } = await vi.hoisted(async () => {
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
  }
})

mockNuxtImport("useCart", () => () => cart)
mockNuxtImport("useCustomer", () => () => customerState)
mockNuxtImport("useCheckout", () => () => checkout)
mockNuxtImport("navigateTo", () => navigateToMock)

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

type Page = Awaited<ReturnType<typeof mountSuspended>>

const mountPage = async () => {
  const wrapper = await mountSuspended(CheckoutPage)
  await flushPromises()
  return wrapper
}

// Fills the form and submits the first part.
const submitAddress = async (wrapper: Page, overrides: Partial<typeof valid> = {}) => {
  for (const [name, value] of Object.entries({ ...valid, ...overrides })) {
    await wrapper.find(`input[name="${name}"]`).setValue(value)
  }
  await wrapper.find("form").trigger("submit")
  await flushPromises()
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
})

describe("checkout page", () => {
  it("shows the empty text and no form for an empty cart", async () => {
    cart.cart.value = null
    const wrapper = await mountPage()

    expect(wrapper.text()).toContain("Your cart is empty.")
    expect(wrapper.find("form").exists()).toBe(false)
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

    expect(checkout.saveContact).toHaveBeenCalledWith(valid)
    expect(wrapper.text()).toContain("Standard Shipping")
    expect(wrapper.text()).toContain("Rp 18.000")
    expect(checkout.selectShippingOption).toHaveBeenCalledWith("so_1")
    expect(wrapper.find('[data-testid="pay"]').attributes("disabled")).toBeUndefined()
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
})
