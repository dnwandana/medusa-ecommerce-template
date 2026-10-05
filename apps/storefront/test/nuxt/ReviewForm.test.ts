import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ReviewForm } from "#components"

const { reviews } = vi.hoisted(() => ({
  reviews: { submit: vi.fn(), listReviewableItems: vi.fn(), listForProduct: vi.fn() },
}))

mockNuxtImport("useReviews", () => () => reviews)

const item = {
  order_id: "order_1",
  order_display_id: 12,
  order_line_item_id: "ordli_1",
  product_id: "prod_1",
  product_title: "Plain T-Shirt",
  variant_title: "M",
  thumbnail: null,
}

type Form = Awaited<ReturnType<typeof mountSuspended>>

const fill = async (wrapper: Form) => {
  await wrapper.find('input[name="rating"][value="4"]').setValue(true)
  await wrapper.find('input[name="title"]').setValue("Good")
  await wrapper.find('textarea[name="content"]').setValue("Fits well.")
}

const submit = async (wrapper: Form) => {
  await wrapper.find("form").trigger("submit")
  await flushPromises()
}

beforeEach(() => {
  reviews.submit.mockReset().mockResolvedValue(undefined)
})

describe("ReviewForm", () => {
  it("sends the review and replaces the form with the confirmation", async () => {
    const wrapper = await mountSuspended(ReviewForm, { props: { item } })
    await fill(wrapper)

    await submit(wrapper)

    expect(reviews.submit).toHaveBeenCalledWith({
      order_line_item_id: "ordli_1",
      rating: 4,
      title: "Good",
      content: "Fits well.",
    })
    expect(wrapper.text()).toContain("Thank you. Your review shows after approval.")
    expect(wrapper.find("form").exists()).toBe(false)
    expect(wrapper.emitted("submitted")).toHaveLength(1)
  })

  it("shows the field errors and sends nothing for an empty form", async () => {
    const wrapper = await mountSuspended(ReviewForm, { props: { item } })

    await submit(wrapper)

    expect(wrapper.text()).toContain("Select a rating from 1 to 5.")
    expect(wrapper.text()).toContain("Write your review.")
    expect(reviews.submit).not.toHaveBeenCalled()
  })

  it("shows the reason when the backend refuses the review", async () => {
    reviews.submit.mockRejectedValue(Object.assign(new Error("HTTP 422"), { status: 422 }))
    const wrapper = await mountSuspended(ReviewForm, { props: { item } })
    await fill(wrapper)

    await submit(wrapper)

    expect(wrapper.text()).toContain("You already reviewed this purchase.")
    expect(wrapper.find("form").exists()).toBe(true)
    expect(wrapper.emitted("submitted")).toBeUndefined()
  })
})
