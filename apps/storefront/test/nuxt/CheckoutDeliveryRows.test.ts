import { mountSuspended } from "@nuxt/test-utils/runtime"
import { describe, expect, it } from "vitest"
import CheckoutDeliveryRows from "~/components/CheckoutDeliveryRows.vue"

const standard = { id: "so_std", name: "Standard Shipping", amount: 18000 }
const instant = { id: "so_fast", name: "Instant Courier", amount: 45000 }

describe("CheckoutDeliveryRows", () => {
  it("shows a radio row with the price for each option", async () => {
    const wrapper = await mountSuspended(CheckoutDeliveryRows, {
      props: { options: [standard, instant], selectedId: "so_std" },
    })
    const rows = wrapper.findAll("label")
    expect(rows.map((row) => row.text())).toEqual([
      "Standard ShippingRp 18.000",
      "Instant CourierRp 45.000",
    ])
    expect(wrapper.findAll("button[role='radio']")).toHaveLength(2)
    await wrapper.findAll("button[role='radio']")[1]!.trigger("click")
    expect(wrapper.emitted("select")).toEqual([["so_fast"]])
  })

  it("shows one option as one selected row with no radio", async () => {
    const wrapper = await mountSuspended(CheckoutDeliveryRows, {
      props: { options: [standard], selectedId: "so_std" },
    })
    expect(wrapper.find("button[role='radio']").exists()).toBe(false)
    expect(wrapper.text()).toContain("Standard ShippingRp 18.000")
  })

  it("shows Free for a price of 0", async () => {
    const wrapper = await mountSuspended(CheckoutDeliveryRows, {
      props: { options: [{ ...standard, amount: 0 }, instant], selectedId: null },
    })
    expect(wrapper.findAll("label")[0]!.text()).toBe("Standard ShippingFree")
  })

  it("shows no price for an option with no amount", async () => {
    const wrapper = await mountSuspended(CheckoutDeliveryRows, {
      props: { options: [{ ...standard, amount: null }, instant], selectedId: null },
    })
    expect(wrapper.findAll("label")[0]!.text()).toBe("Standard Shipping")
  })

  it("shows two skeleton rows while the options load", async () => {
    const wrapper = await mountSuspended(CheckoutDeliveryRows, {
      props: { options: [], selectedId: null, loading: true },
    })
    expect(wrapper.get("[role='status']").text()).toBe("Loading shipping options…")
    expect(wrapper.findAll("[data-slot='skeleton-row']")).toHaveLength(2)
  })

  it("renders nothing with no options", async () => {
    const wrapper = await mountSuspended(CheckoutDeliveryRows, {
      props: { options: [], selectedId: null },
    })
    expect(wrapper.text()).toBe("")
  })
})
