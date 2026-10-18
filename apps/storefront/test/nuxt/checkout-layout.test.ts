import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime"
import { describe, expect, it, vi } from "vitest"
import CheckoutLayout from "~/layouts/checkout.vue"

const load = vi.fn().mockResolvedValue(undefined)
const refresh = vi.fn().mockResolvedValue(undefined)
mockNuxtImport("useCart", () => () => ({ load, itemCount: ref(0) }))
mockNuxtImport("useCustomer", () => () => ({ refresh, customer: ref(null) }))

describe("checkout layout", () => {
  it("shows the back link, the wordmark and the secure label, with no navigation", async () => {
    const wrapper = await mountSuspended(CheckoutLayout, { slots: { default: () => "Body" } })
    const header = wrapper.get("header")
    expect(header.get("a[href='/cart']").text()).toContain("Back to cart")
    expect(header.get("a[href='/']").text()).toBe("Everyday")
    expect(header.text()).toContain("Secure checkout")
    expect(header.findAll("a")).toHaveLength(2)
    expect(wrapper.text()).toContain("Body")
  })

  it("shows the copyright and the Privacy, Terms and Help links in the footer", async () => {
    const wrapper = await mountSuspended(CheckoutLayout)
    const footer = wrapper.get("footer")
    expect(footer.findAll("a").map((a) => a.attributes("href"))).toEqual([
      "/privacy",
      "/terms",
      "/contact",
    ])
    expect(footer.text()).toContain(`© ${new Date().getFullYear()} Everyday`)
  })

  it("loads the cart and the customer after the mount", async () => {
    await mountSuspended(CheckoutLayout)
    expect(load).toHaveBeenCalled()
    expect(refresh).toHaveBeenCalled()
  })
})
