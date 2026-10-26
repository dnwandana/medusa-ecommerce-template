import { mountSuspended } from "@nuxt/test-utils/runtime"
import { describe, expect, it } from "vitest"
import CheckoutPaymentRows from "~/components/CheckoutPaymentRows.vue"
import { BANK_TRANSFER_PROVIDER_ID } from "~/utils/bankTransfer"

describe("CheckoutPaymentRows", () => {
  it("shows three skeleton rows while the providers load", async () => {
    const wrapper = await mountSuspended(CheckoutPaymentRows, {
      props: { modelValue: null, providers: [], state: "loading", deadlineHours: 24 },
    })
    expect(wrapper.get("[role='status']").text()).toBe("Loading…")
    expect(wrapper.findAll("[data-testid='payment-skeleton-row']")).toHaveLength(3)
  })

  it("shows one provider as a selected row with the caption and the hint", async () => {
    const wrapper = await mountSuspended(CheckoutPaymentRows, {
      props: {
        modelValue: BANK_TRANSFER_PROVIDER_ID,
        providers: [{ id: BANK_TRANSFER_PROVIDER_ID }],
        state: "ready",
        deadlineHours: 24,
      },
    })
    expect(wrapper.find("button[role='radio']").exists()).toBe(false)
    expect(wrapper.text()).toContain("Bank transfer")
    expect(wrapper.text()).toContain("Manual transfer, confirmed by the store")
    expect(wrapper.text()).toContain("You get the bank details after you place the order.")
    expect(
      wrapper.find(`[data-testid='payment-provider-${BANK_TRANSFER_PROVIDER_ID}']`).exists()
    ).toBe(true)
  })

  it("shows radio rows and the hint of the selected gateway", async () => {
    const wrapper = await mountSuspended(CheckoutPaymentRows, {
      props: {
        modelValue: "pp_gateway_card",
        providers: [{ id: BANK_TRANSFER_PROVIDER_ID }, { id: "pp_gateway_card" }],
        state: "ready",
        deadlineHours: 24,
      },
    })
    expect(wrapper.findAll("button[role='radio']")).toHaveLength(2)
    expect(
      wrapper.find(`[data-testid='payment-provider-${BANK_TRANSFER_PROVIDER_ID}']`).exists()
    ).toBe(true)
    expect(wrapper.text()).toContain("Online payment")
    expect(wrapper.text()).toContain("Card, QRIS, virtual account or e-wallet")
    expect(wrapper.text()).toContain("You pay on the secure page of our payment partner.")
    expect(wrapper.text()).not.toContain("You get the bank details")
    await wrapper.findAll("button[role='radio']")[0]!.trigger("click")
    expect(wrapper.emitted("update:modelValue")).toEqual([[BANK_TRANSFER_PROVIDER_ID]])
  })

  it("shows the error with a retry button", async () => {
    const wrapper = await mountSuspended(CheckoutPaymentRows, {
      props: { modelValue: null, providers: [], state: "failed", deadlineHours: 24 },
    })
    expect(wrapper.get("[data-testid='payment-providers-error']").text()).toContain(
      "An error occurred. Try again."
    )
    await wrapper.get("[data-testid='payment-providers-error'] button").trigger("click")
    expect(wrapper.emitted("retry")).toHaveLength(1)
  })

  it("says that the store has no payment method", async () => {
    const wrapper = await mountSuspended(CheckoutPaymentRows, {
      props: { modelValue: null, providers: [], state: "ready", deadlineHours: 24 },
    })
    expect(wrapper.text()).toBe("This store has no payment method now. Contact the store.")
  })
})
