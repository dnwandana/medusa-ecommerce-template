import { mountSuspended } from "@nuxt/test-utils/runtime"
import { describe, expect, it } from "vitest"
import ProductDetails from "~/components/ProductDetails.vue"

const product = (metadata: object, tags: { value: string }[] = []) =>
  ({ id: "prod_1", metadata: { product_details: metadata }, tags }) as never

describe("ProductDetails", () => {
  it("shows two sections with the fabric first in Fabric and care", async () => {
    const wrapper = await mountSuspended(ProductDetails, {
      props: {
        product: product(
          { details: [{ en: "Relaxed fit" }], care: [{ en: "Machine wash cold" }] },
          [{ value: "Fabric: Linen" }]
        ),
      },
    })
    const triggers = wrapper.findAll("button")

    expect(triggers.map((trigger) => trigger.text())).toEqual([
      "Details and fit",
      "Fabric and care",
    ])
    expect(wrapper.findAll("h2")).toHaveLength(2)
    await triggers[1]!.trigger("click")
    expect(
      wrapper
        .findAll("li")
        .filter((line) => line.isVisible())
        .map((line) => line.text())
    ).toEqual(["Linen", "Machine wash cold"])
  })

  it("shows Fabric and care with only a fabric tag", async () => {
    const wrapper = await mountSuspended(ProductDetails, {
      props: { product: product({ details: [], care: [] }, [{ value: "Fabric: Cotton" }]) },
    })
    expect(wrapper.findAll("button").map((trigger) => trigger.text())).toEqual(["Fabric and care"])
  })

  it("renders nothing with no lines and no fabric", async () => {
    const wrapper = await mountSuspended(ProductDetails, { props: { product: product({}) } })
    expect(wrapper.find("button").exists()).toBe(false)
  })
})
