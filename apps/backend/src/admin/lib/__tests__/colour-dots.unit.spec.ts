import { colourDotRows, parseHex, withColourHex } from "../colour-dots"

const options = [
  { title: "Size", values: [{ value: "S" }] },
  { title: " Colour ", values: [{ value: "Sand" }, { value: "Sage" }, { value: "White" }] },
]
const store = [
  { name: "sand", hex: "#d9c7a7" },
  { name: "Sage", hex: "#a0a890" },
]

describe("colour dots", () => {
  it("takes the product hex first, then the store list", () => {
    expect(colourDotRows(options, { Sage: "#9aa68c" }, store)).toEqual([
      { value: "Sand", hex: "#d9c7a7", source: "store" },
      { value: "Sage", hex: "#9aa68c", source: "product" },
      { value: "White", hex: null, source: "none" },
    ])
    expect(colourDotRows([options[0]], {}, store)).toEqual([])
  })

  it("checks a hex", () => {
    expect(parseHex(" #9AA68C ")).toEqual({ hex: "#9aa68c", error: null })
    expect(parseHex("9aa68c")).toEqual({ hex: null, error: "Enter a hex in the format #rrggbb." })
  })

  it("sets and removes the hex of one value", () => {
    const metadata = { note: "a", colour_hex: { Sage: "#9aa68c", Ink: "#2c3a52" } }
    expect(withColourHex(metadata, "Sage", null)).toEqual({
      note: "a",
      colour_hex: { Ink: "#2c3a52" },
    })
    expect(withColourHex(null, "Sand", "#d9c7a7")).toEqual({ colour_hex: { Sand: "#d9c7a7" } })
  })
})
