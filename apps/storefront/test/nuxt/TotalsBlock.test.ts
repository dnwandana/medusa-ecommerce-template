import { mountSuspended } from "@nuxt/test-utils/runtime"
import { describe, expect, it } from "vitest"
import TotalsBlock from "~/components/TotalsBlock.vue"

describe("TotalsBlock", () => {
  it("shows the rows with Delivery and Free", async () => {
    const wrapper = await mountSuspended(TotalsBlock, {
      props: { subtotal: 1075000, delivery: 0, discount: 50000, total: 1025000 },
    })
    const rows = wrapper.findAll("[data-slot='totals-row']").map((r) => r.text())
    expect(rows).toEqual([
      "SubtotalRp 1.075.000",
      "DeliveryFree",
      "Discount-Rp 50.000",
      "TotalRp 1.025.000",
    ])
    expect(wrapper.text()).not.toContain("Shipping")
    expect(wrapper.text()).not.toContain("Complimentary")
  })

  it("shows the checkout text before a delivery method is chosen", async () => {
    const wrapper = await mountSuspended(TotalsBlock, {
      props: { subtotal: 150000, delivery: null, total: 150000 },
    })
    expect(wrapper.text()).toContain("Calculated at checkout")
    expect(wrapper.find("[data-row='discount']").exists()).toBe(false)
    expect(wrapper.find("[data-row='savings']").exists()).toBe(false)
  })

  it("shows You save after the subtotal", async () => {
    const wrapper = await mountSuspended(TotalsBlock, {
      props: { subtotal: 375000, savings: 25000, delivery: null, total: 375000 },
    })
    const rows = wrapper.findAll("[data-slot='totals-row']").map((r) => r.text())
    expect(rows.slice(0, 2)).toEqual(["SubtotalRp 375.000", "You save-Rp 25.000"])
  })

  it("uses the total label of the caller", async () => {
    const wrapper = await mountSuspended(TotalsBlock, {
      props: { subtotal: 150000, delivery: 18000, total: 168000, totalLabel: "Paid" },
    })
    expect(wrapper.get("[data-row='total']").text()).toBe("PaidRp 168.000")
    expect(wrapper.get("[data-row='delivery']").text()).toBe("DeliveryRp 18.000")
  })
})
