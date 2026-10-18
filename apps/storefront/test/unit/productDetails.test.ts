import { describe, expect, it } from "vitest"
import { localizedLines, productFabric, readProductDetails } from "~/utils/productDetails"

describe("readProductDetails", () => {
  it("reads the details and drops a line with no English text", () => {
    expect(
      readProductDetails({
        product_details: {
          details: [
            { en: "Relaxed fit", id: "Potongan longgar" },
            { en: " ", id: "Kosong" },
          ],
          care: [{ en: "Machine wash cold" }],
        },
      })
    ).toEqual({
      details: [{ en: "Relaxed fit", id: "Potongan longgar" }],
      care: [{ en: "Machine wash cold" }],
    })
    expect(readProductDetails({ product_details: "text" })).toEqual({ details: [], care: [] })
    expect(readProductDetails(null)).toEqual({ details: [], care: [] })
  })

  it("drops a line that is not an object and a list that is not an array", () => {
    expect(
      readProductDetails({ product_details: { details: ["Relaxed fit", null], care: "Wash" } })
    ).toEqual({ details: [], care: [] })
  })
})

describe("localizedLines", () => {
  it("uses English when the Bahasa Indonesia line is empty", () => {
    const lines = [
      { en: "Relaxed fit", id: "Potongan longgar" },
      { en: "Wash cold", id: " " },
    ]
    expect(localizedLines(lines, "id")).toEqual(["Potongan longgar", "Wash cold"])
    expect(localizedLines(lines, "en")).toEqual(["Relaxed fit", "Wash cold"])
  })
})

describe("productFabric", () => {
  it("reads the fabric of the first fabric tag", () => {
    expect(
      productFabric({ tags: [{ value: "Summer" }, { value: "Fabric: Linen" }] } as never)
    ).toBe("Linen")
    expect(productFabric({ tags: [] } as never)).toBeNull()
    expect(productFabric({} as never)).toBeNull()
  })
})
