import { mountSuspended } from "@nuxt/test-utils/runtime"
import { describe, expect, it } from "vitest"
import { Button } from "#components"

describe("shadcn-vue Button", () => {
  it("renders a button with its slot text", async () => {
    const wrapper = await mountSuspended(Button, { slots: { default: () => "Add to cart" } })

    expect(wrapper.element.tagName).toBe("BUTTON")
    expect(wrapper.text()).toBe("Add to cart")
  })
})
