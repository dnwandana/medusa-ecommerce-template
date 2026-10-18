import {
  fabricFromTags,
  parseDetailsForm,
  toDetailsForm,
  withProductDetails,
} from "../product-details-form"

describe("product details form", () => {
  it("adds one empty row to an empty list", () => {
    expect(toDetailsForm({ details: [{ en: "Relaxed fit" }], care: [] })).toEqual({
      details: [{ en: "Relaxed fit", id: "" }],
      care: [{ en: "", id: "" }],
    })
  })

  it("ignores empty rows and leaves out an empty translation", () => {
    const result = parseDetailsForm({
      details: [
        { en: " Relaxed fit ", id: " Potongan longgar " },
        { en: "", id: "" },
      ],
      care: [{ en: "Machine wash cold", id: "" }],
    })
    expect(result).toEqual({
      value: {
        details: [{ en: "Relaxed fit", id: "Potongan longgar" }],
        care: [{ en: "Machine wash cold" }],
      },
      errors: { details: {}, care: {} },
    })
  })

  it("refuses a row with only the Bahasa Indonesia line", () => {
    const result = parseDetailsForm({ details: [{ en: "", id: "Potongan longgar" }], care: [] })
    expect(result.value).toBeNull()
    expect(result.errors.details).toEqual({
      0: "Enter the English line. The Bahasa Indonesia line is optional.",
    })
  })

  it("keeps the other metadata keys", () => {
    expect(withProductDetails({ note: "a" }, { details: [], care: [] })).toEqual({
      note: "a",
      product_details: { details: [], care: [] },
    })
  })

  it("finds the fabric tag", () => {
    expect(fabricFromTags([{ value: "summer" }, { value: "Fabric: Linen" }])).toBe("Linen")
    expect(fabricFromTags(null)).toBeNull()
  })
})
