import { readColourHex, readProductDetails } from "../storefront-metadata"

describe("storefront metadata", () => {
  it("reads the product details and drops a line with no English text", () => {
    const metadata = {
      product_details: {
        details: [{ en: "Relaxed fit", id: "Potongan longgar" }, { id: "Saja" }],
        care: [],
      },
    }
    expect(readProductDetails(metadata)).toEqual({
      details: [{ en: "Relaxed fit", id: "Potongan longgar" }],
      care: [],
    })
  })

  it("gives empty lists for a value of the wrong shape", () => {
    expect(readProductDetails({ product_details: "x" })).toEqual({ details: [], care: [] })
    expect(readProductDetails(null)).toEqual({ details: [], care: [] })
  })

  it("keeps only the hex values of colour_hex", () => {
    expect(readColourHex({ colour_hex: { Sage: "#9aa68c", Bad: "green" } })).toEqual({
      Sage: "#9aa68c",
    })
  })
})
