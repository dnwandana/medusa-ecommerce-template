import { mountSuspended } from "@nuxt/test-utils/runtime"
import { describe, expect, it } from "vitest"
import { h } from "vue"
import IconCountButton from "~/components/IconCountButton.vue"

describe("IconCountButton", () => {
  it("shows the count above 0", async () => {
    const wrapper = await mountSuspended(IconCountButton, {
      props: { label: "Cart, 2 items", count: 2, to: "/cart" },
      slots: { default: () => h("svg") },
    })
    expect(wrapper.get("a").attributes("aria-label")).toBe("Cart, 2 items")
    expect(wrapper.get("[data-slot='count']").text()).toBe("2")
    expect(wrapper.get("[data-slot='count']").attributes("aria-hidden")).toBe("true")
  })

  it("hides the count at 0 and renders a button without a link", async () => {
    const wrapper = await mountSuspended(IconCountButton, {
      props: { label: "Wishlist", count: 0 },
    })
    expect(wrapper.find("[data-slot='count']").exists()).toBe(false)
    expect(wrapper.get("button").classes()).toContain("size-11")
  })

  it("shows 99+ above 99", async () => {
    const wrapper = await mountSuspended(IconCountButton, { props: { label: "Cart", count: 120 } })
    expect(wrapper.get("[data-slot='count']").text()).toBe("99+")
  })
})
