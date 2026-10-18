import { fabricLabel, isColourOption, isSizeOption } from "../option-names"

describe("option names", () => {
  it.each(["Colour", " color ", "WARNA"])("knows %s as the colour option", (title) => {
    expect(isColourOption(title)).toBe(true)
  })

  it("knows Size and Ukuran as the size option", () => {
    expect(isSizeOption("Size")).toBe(true)
    expect(isSizeOption("ukuran")).toBe(true)
    expect(isSizeOption("Material")).toBe(false)
  })

  it("reads the fabric label of a tag", () => {
    expect(fabricLabel("Fabric: Linen")).toBe("Linen")
    expect(fabricLabel("Fabric:")).toBeNull()
    expect(fabricLabel("Linen")).toBeNull()
  })
})
