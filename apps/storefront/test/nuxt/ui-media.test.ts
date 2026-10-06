import { mountSuspended } from "@nuxt/test-utils/runtime"
import { describe, expect, it } from "vitest"
import { AspectRatio, Avatar, AvatarFallback, Empty, EmptyMedia, EmptyTitle } from "#components"
import { defineComponent, h } from "vue"

describe("media components", () => {
  it("keeps a 3:4 ratio", async () => {
    const wrapper = await mountSuspended(AspectRatio, { props: { ratio: 3 / 4 } })

    expect(wrapper.html()).toContain("padding-bottom: 133.3")
  })

  it("shows the initials in the avatar fallback", async () => {
    const Face = defineComponent(() => () => h(Avatar, () => h(AvatarFallback, () => "SD")))
    const wrapper = await mountSuspended(Face)

    expect(wrapper.text()).toBe("SD")
  })

  it.each([
    ["muted", "bg-muted"],
    ["success", "bg-success-soft"],
    ["warning", "bg-warning-soft"],
    ["destructive", "bg-destructive-soft"],
  ] as const)("gives the %s media circle the class %s", async (tone, background) => {
    const wrapper = await mountSuspended(EmptyMedia, { props: { tone } })

    expect(wrapper.classes()).toContain(background)
    expect(wrapper.classes()).toContain("size-14")
    expect(wrapper.classes()).toContain("rounded-full")
  })

  it("gives the outline Empty a dashed border", async () => {
    const wrapper = await mountSuspended(Empty, { props: { variant: "outline" } })
    const title = await mountSuspended(EmptyTitle, {
      slots: { default: () => "Your cart is empty." },
    })

    expect(wrapper.classes()).toContain("border-dashed")
    expect(title.classes()).toContain("text-h3")
  })
})
