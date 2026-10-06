import { mountSuspended } from "@nuxt/test-utils/runtime"
import { describe, expect, it } from "vitest"
import { Alert, Skeleton, Spinner } from "#components"

describe("Alert", () => {
  // Review Focus: a page with a success Alert and an error Alert has one role="alert" only.
  it.each([
    ["destructive", "alert"],
    ["success", "status"],
    ["info", "status"],
    ["default", "status"],
  ] as const)("gives the %s variant role=%s", async (variant, role) => {
    const wrapper = await mountSuspended(Alert, { props: { variant }, slots: { default: () => "Text" } })

    expect(wrapper.attributes("role")).toBe(role)
  })

  it("uses the soft colours", async () => {
    const success = await mountSuspended(Alert, { props: { variant: "success" } })
    const error = await mountSuspended(Alert, { props: { variant: "destructive" } })

    expect(success.classes()).toContain("bg-success-soft")
    expect(error.classes()).toContain("bg-destructive-soft")
  })
})

describe("Spinner", () => {
  it("is a hidden LoaderCircle icon that turns slower for reduced motion", async () => {
    const wrapper = await mountSuspended(Spinner)

    expect(wrapper.attributes("aria-hidden")).toBe("true")
    expect(wrapper.classes()).toContain("animate-spin")
    expect(wrapper.classes()).toContain("motion-reduce:[animation-duration:3s]")
  })
})

describe("Skeleton", () => {
  it("stops the animation for reduced motion", async () => {
    const wrapper = await mountSuspended(Skeleton)

    expect(wrapper.classes()).toContain("animate-pulse")
    expect(wrapper.classes()).toContain("motion-reduce:animate-none")
  })
})
