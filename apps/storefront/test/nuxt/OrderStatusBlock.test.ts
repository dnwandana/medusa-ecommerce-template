import { mountSuspended } from "@nuxt/test-utils/runtime"
import { describe, expect, it } from "vitest"
import OrderStatusBlock from "~/components/OrderStatusBlock.vue"

const contact = { email: "halo@everyday.id", whatsapp: "+62 812-3456-7890" }

describe("OrderStatusBlock", () => {
  it("explains a cancel after 24 hours with no payment", async () => {
    const wrapper = await mountSuspended(OrderStatusBlock, {
      props: { status: "cancelled", cancelReason: "payment_timeout", refunded: 0, contact },
    })
    expect(wrapper.get('[data-testid="order-status-block"]').exists()).toBe(true)
    expect(wrapper.text()).toContain(
      "We cancelled this order because we did not get your payment within 24 hours."
    )
    expect(wrapper.text()).not.toContain("We refunded")
  })

  it("explains a cancel by the store", async () => {
    const wrapper = await mountSuspended(OrderStatusBlock, {
      props: { status: "cancelled", cancelReason: null, refunded: 0, contact },
    })
    expect(wrapper.text()).toContain(
      "The store cancelled this order. Contact us if you have questions."
    )
  })

  it("adds the refunded amount to a cancelled order with a refund", async () => {
    const wrapper = await mountSuspended(OrderStatusBlock, {
      props: { status: "cancelled", cancelReason: null, refunded: 249000, contact },
    })
    expect(wrapper.text()).toContain("The store cancelled this order.")
    expect(wrapper.text()).toContain("We refunded Rp 249.000 to you.")
  })

  it("gives the refunded amount", async () => {
    const wrapper = await mountSuspended(OrderStatusBlock, {
      props: { status: "refunded", cancelReason: null, refunded: 249000, contact },
    })
    expect(wrapper.text()).toContain("We refunded Rp 249.000 to you.")
    expect(wrapper.text()).not.toContain("cancelled")
  })

  it("links the store email and WhatsApp", async () => {
    const wrapper = await mountSuspended(OrderStatusBlock, {
      props: { status: "cancelled", cancelReason: null, refunded: 0, contact },
    })
    expect(wrapper.get("a[href='mailto:halo@everyday.id']").text()).toBe("halo@everyday.id")
    expect(wrapper.get("a[href='https://wa.me/6281234567890']").text()).toBe("+62 812-3456-7890")
    expect(wrapper.text()).toContain("Contact us:")
    expect(wrapper.text()).toContain(" or ")
  })

  it("shows no 'or' with only one contact", async () => {
    const wrapper = await mountSuspended(OrderStatusBlock, {
      props: {
        status: "cancelled",
        cancelReason: null,
        refunded: 0,
        contact: { email: null, whatsapp: "+62 812-3456-7890" },
      },
    })
    expect(wrapper.findAll("a")).toHaveLength(1)
    expect(wrapper.text()).toContain("Contact us:")
    expect(wrapper.text()).not.toContain(" or ")
  })

  it("shows no contact line with no contact", async () => {
    const wrapper = await mountSuspended(OrderStatusBlock, {
      props: {
        status: "cancelled",
        cancelReason: null,
        refunded: 0,
        contact: { email: null, whatsapp: null },
      },
    })
    expect(wrapper.text()).not.toContain("Contact us:")
    expect(wrapper.find("a").exists()).toBe(false)
  })

  it("shows no contact line when the contact is null", async () => {
    const wrapper = await mountSuspended(OrderStatusBlock, {
      props: { status: "cancelled", cancelReason: null, refunded: 0, contact: null },
    })
    expect(wrapper.text()).not.toContain("Contact us:")
  })
})
