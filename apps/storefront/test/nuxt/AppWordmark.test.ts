import { mountSuspended } from "@nuxt/test-utils/runtime"
import { describe, expect, it } from "vitest"
import AppWordmark from "~/components/AppWordmark.vue"

describe("AppWordmark", () => {
  it("links to the home page with the brand name", async () => {
    const wrapper = await mountSuspended(AppWordmark)
    const link = wrapper.get("a")
    expect(link.attributes("href")).toBe("/")
    expect(link.text()).toBe("Everyday")
    expect(link.classes()).toContain("font-heading")
  })

  it("uses the footer size", async () => {
    const wrapper = await mountSuspended(AppWordmark, { props: { size: "footer" } })
    expect(wrapper.get("a").attributes("data-size")).toBe("footer")
  })
})
