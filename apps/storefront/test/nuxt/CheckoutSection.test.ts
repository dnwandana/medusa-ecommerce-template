import { mountSuspended } from "@nuxt/test-utils/runtime"
import { describe, expect, it } from "vitest"
import CheckoutSection from "~/components/CheckoutSection.vue"

describe("CheckoutSection", () => {
  it("shows the number, the title, the aside and the body", async () => {
    const wrapper = await mountSuspended(CheckoutSection, {
      props: { number: 1, title: "Contact" },
      slots: { default: () => "Email field", aside: () => "Have an account?" },
    })
    const heading = wrapper.get("h2#checkout-section-1")
    expect(heading.text()).toBe("01Contact")
    expect(heading.get("span").attributes("aria-hidden")).toBe("true")
    expect(wrapper.get("section").attributes("aria-labelledby")).toBe("checkout-section-1")
    expect(wrapper.get("section").attributes("data-testid")).toBe("checkout-section-1")
    expect(wrapper.text()).toContain("Have an account?")
    expect(wrapper.text()).toContain("Email field")
  })

  it("shows a muted title and one line while it waits", async () => {
    const wrapper = await mountSuspended(CheckoutSection, {
      props: {
        number: 3,
        title: "Delivery method",
        waiting: "Save the address to see the delivery methods.",
      },
      slots: { default: () => "Rows", aside: () => "Aside" },
    })
    expect(wrapper.get("h2").classes()).toContain("text-muted-foreground")
    expect(wrapper.get("p").text()).toBe("Save the address to see the delivery methods.")
    expect(wrapper.text()).not.toContain("Rows")
    expect(wrapper.text()).not.toContain("Aside")
  })
})
