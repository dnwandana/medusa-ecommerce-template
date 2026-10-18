import { toColourPayload, validateColourForm } from "../colour-form"

describe("colour form", () => {
  it("accepts a name and a six-digit hex", () => {
    expect(validateColourForm({ name: "Sand", hex: "#D9C7A7" })).toEqual({})
  })

  it("names each wrong field", () => {
    expect(validateColourForm({ name: "  ", hex: "d9c7a7" })).toEqual({
      name: "Enter a name.",
      hex: "Enter a hex in the format #rrggbb.",
    })
    expect(validateColourForm({ name: "Sand", hex: "#fff" }).hex).toBe(
      "Enter a hex in the format #rrggbb."
    )
  })

  it("trims the values and puts the hex in lower case", () => {
    expect(toColourPayload({ name: " Sand ", hex: " #D9C7A7 " })).toEqual({
      name: "Sand",
      hex: "#d9c7a7",
    })
  })
})
