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
    ["muted", "bg-muted", "text-foreground"],
    ["success", "bg-success-soft", "text-success"],
    ["warning", "bg-warning-soft", "text-warning"],
    ["destructive", "bg-destructive-soft", "text-destructive"],
  ] as const)("gives the %s disc the class %s", async (tone, background, text) => {
    const wrapper = await mountSuspended(EmptyMedia, { props: { tone, shape: "disc" } })

    expect(wrapper.classes()).toEqual(
      expect.arrayContaining([background, text, "size-16", "rounded-full"])
    )
  })

  it.each([
    ["success", "text-success"],
    ["destructive", "text-destructive"],
  ] as const)("gives the %s circle only the icon colour", async (tone, text) => {
    const wrapper = await mountSuspended(EmptyMedia, { props: { tone } })

    expect(wrapper.classes()).toContain(text)
    expect(wrapper.classes()).toContain("bg-transparent")
  })

  it("draws a hairline circle by default", async () => {
    const wrapper = await mountSuspended(EmptyMedia)
    expect(wrapper.attributes("data-shape")).toBe("circle")
    expect(wrapper.classes()).toEqual(
      expect.arrayContaining([
        "size-16",
        "rounded-full",
        "border",
        "border-border",
        "bg-transparent",
      ])
    )
  })

  it("draws a filled disc in the tone colour", async () => {
    const wrapper = await mountSuspended(EmptyMedia, { props: { shape: "disc", tone: "success" } })
    expect(wrapper.classes()).toEqual(expect.arrayContaining(["bg-success-soft", "text-success"]))
    expect(wrapper.classes()).not.toContain("border")
  })

  it("sets the empty title in the serif face", async () => {
    const wrapper = await mountSuspended(EmptyTitle, {
      slots: { default: () => "Your cart is empty" },
    })
    expect(wrapper.classes()).toEqual(expect.arrayContaining(["font-heading", "text-h3"]))
  })

  it("has no outline Empty", async () => {
    const wrapper = await mountSuspended(Empty)

    expect(wrapper.classes()).not.toContain("border-dashed")
  })
})
