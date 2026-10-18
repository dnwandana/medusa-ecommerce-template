import { mountSuspended } from "@nuxt/test-utils/runtime"
import { describe, expect, it } from "vitest"
import AnnouncementBar from "~/components/AnnouncementBar.vue"

describe("AnnouncementBar", () => {
  it("shows the line from the locale file in an ink bar", async () => {
    const wrapper = await mountSuspended(AnnouncementBar)
    expect(wrapper.text()).toBe("Delivered to your door, across Indonesia")
    expect(wrapper.classes()).toEqual(expect.arrayContaining(["bg-foreground", "h-9"]))
    expect(wrapper.classes()).not.toContain("sticky")
  })

  it("names the region with the line, so a screen reader can skip it", async () => {
    const wrapper = await mountSuspended(AnnouncementBar)
    expect(wrapper.attributes("role")).toBe("region")
    expect(wrapper.attributes("aria-label")).toBe("Delivered to your door, across Indonesia")
  })
})
