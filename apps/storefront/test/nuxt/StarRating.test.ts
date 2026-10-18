import { mountSuspended } from "@nuxt/test-utils/runtime"
import { describe, expect, it } from "vitest"
import { StarRating } from "#components"

describe("StarRating", () => {
  it("rounds to the nearest half and shows a half star", async () => {
    const wrapper = await mountSuspended(StarRating, { props: { rating: 3.6 } })

    expect(wrapper.findAll('[data-filled="true"]')).toHaveLength(4)
    expect(wrapper.findAll('[data-half="true"]')).toHaveLength(1)
    expect(wrapper.find('[role="img"]').exists()).toBe(true)
  })

  it("clamps a rating above 5", async () => {
    const wrapper = await mountSuspended(StarRating, { props: { rating: 7 } })

    expect(wrapper.findAll('[data-filled="true"]')).toHaveLength(5)
  })

  it("shows the value and the count next to the stars", async () => {
    const wrapper = await mountSuspended(StarRating, {
      props: { rating: 4.46, count: 12, showValue: true },
    })
    expect(wrapper.get("[role='img']").attributes("aria-label")).toBe("4.5 out of 5 stars")
    expect(wrapper.get("[data-slot='rating-value']").text()).toBe("4.5")
    expect(wrapper.get("[data-slot='rating-value']").attributes("aria-hidden")).toBe("true")
    expect(wrapper.get("[data-slot='rating-count']").text()).toBe("(12 reviews)")
    expect(wrapper.get("[data-slot='rating-count']").attributes("aria-hidden")).toBe("true")
    expect(wrapper.findAll("[data-half='true']")).toHaveLength(1)
  })

  it("shows only the stars by default", async () => {
    const wrapper = await mountSuspended(StarRating, { props: { rating: 3 } })
    expect(wrapper.find("[data-slot='rating-value']").exists()).toBe(false)
    expect(wrapper.find("[data-slot='rating-count']").exists()).toBe(false)
    expect(wrapper.findAll("[data-filled='true']")).toHaveLength(3)
  })

  it.each([
    ["sm", "size-3.5"],
    ["md", "size-4"],
  ] as const)("draws the %s stars with the class %s", async (size, cls) => {
    const wrapper = await mountSuspended(StarRating, { props: { rating: 5, size } })
    expect(wrapper.find("[data-filled='true'] svg").classes()).toContain(cls)
  })
})
