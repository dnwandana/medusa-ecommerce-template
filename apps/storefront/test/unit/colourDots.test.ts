import { describe, expect, it } from "vitest"
import { colourDots, colourHex } from "../../app/utils/colourDots"
import { fabricLabel, findSizeOption, isColourOption } from "../../app/utils/optionNames"

const STORE = [
  { name: "Sage", hex: "#9aa68c" },
  { name: "Black", hex: "#1d1b18" },
]
const product = (metadata: Record<string, unknown> | null = null) =>
  ({
    metadata,
    options: [
      { id: "opt_size", title: "Ukuran", values: [{ value: "M" }] },
      {
        id: "opt_colour",
        title: " Warna ",
        values: [{ value: "sage" }, { value: "Ink" }, { value: "Black" }],
      },
    ],
  }) as any

describe("option names", () => {
  it("knows the colour and size names in two languages", () => {
    expect(isColourOption("Color")).toBe(true)
    expect(isColourOption("Fabric")).toBe(false)
    expect(isColourOption(null)).toBe(false)
    expect(findSizeOption(product())?.id).toBe("opt_size")
  })

  it("hides the fabric prefix", () => {
    expect(fabricLabel("Fabric: Linen")).toBe("Linen")
    expect(fabricLabel("summer")).toBeNull()
  })
})

describe("colour dots", () => {
  it("takes the store hex and leaves out a colour with no hex", () => {
    expect(colourDots(product(), STORE)).toEqual([
      { name: "sage", hex: "#9aa68c" },
      { name: "Black", hex: "#1d1b18" },
    ])
  })

  it("lets the product hex win over the store list", () => {
    const own = product({ colour_hex: { Sage: "#a0b090", Ink: "#22262e" } })
    expect(colourDots(own, STORE).map((dot) => dot.hex)).toEqual(["#a0b090", "#22262e", "#1d1b18"])
  })

  it("ignores a value that is not a hex colour", () => {
    expect(
      colourHex("Ink", product({ colour_hex: { Ink: "red;background:url(x)" } }), STORE)
    ).toBeNull()
  })

  it("ignores a colour_hex value that is not a plain object", () => {
    expect(colourHex("Sage", product({ colour_hex: ["#000000"] }), STORE)).toBe("#9aa68c")
  })
})
