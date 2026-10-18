import type { HttpTypes } from "@medusajs/types"
import { describe, expect, it } from "vitest"
import {
  addressLine,
  emptyAddressForm,
  fromCustomerAddress,
  joinFullName,
  oneLine,
  sortAddresses,
  splitFullName,
  toCartAddress,
  toCustomerAddressBody,
  validateAddressForm,
} from "../../app/utils/addressForm"

const valid = {
  address_name: "",
  full_name: "Sari Dewi",
  phone: "+62 812-3456-7890",
  address_1: "Jl. Melati No. 12\nRT 03/RW 05",
  city: "Jakarta Pusat",
  province: "DKI Jakarta",
  postal_code: "10310",
}

const savedAddress = {
  id: "caddr_1",
  address_name: null,
  first_name: "Sari",
  last_name: "Dewi",
  phone: null,
  address_1: "Jl. Melati No. 12\nRT 03/RW 05",
  city: "Jakarta Pusat",
  province: null,
  postal_code: null,
} as unknown as HttpTypes.StoreCustomerAddress

describe("splitFullName", () => {
  it.each([
    ["Muhammad Rizky Pratama", "Muhammad Rizky", "Pratama"],
    ["  Sari   Wulandari ", "Sari", "Wulandari"],
    ["Sukarno", "Sukarno", ""],
    ["   ", "", ""],
  ])("splits %j", (name, first_name, last_name) => {
    expect(splitFullName(name)).toEqual({ first_name, last_name })
  })
})

describe("joinFullName", () => {
  it("joins the two parts and leaves out an empty part", () => {
    expect(joinFullName("Muhammad Rizky", "Pratama")).toBe("Muhammad Rizky Pratama")
    expect(joinFullName("Sukarno", "")).toBe("Sukarno")
    expect(joinFullName(null, " Pratama ")).toBe("Pratama")
  })
})

describe("emptyAddressForm", () => {
  it("starts a new form with the name and the phone of the profile", () => {
    expect(
      emptyAddressForm({ first_name: "Sari", last_name: "Wulandari", phone: "081234567890" })
    ).toMatchObject({
      full_name: "Sari Wulandari",
      phone: "081234567890",
      address_1: "",
      province: "",
    })
    expect(emptyAddressForm().full_name).toBe("")
  })
})

describe("validateAddressForm", () => {
  it("requires the name, the phone, the address, the city, the province, and the postal code", () => {
    const required = "checkout.errors.required"
    expect(validateAddressForm(emptyAddressForm())).toEqual({
      full_name: required,
      phone: required,
      address_1: required,
      city: required,
      province: "checkout.errors.province",
      postal_code: required,
    })
  })

  it("accepts a form with no label", () => {
    expect(validateAddressForm(valid)).toEqual({})
  })

  it("asks for a province from the list", () => {
    expect(validateAddressForm({ ...valid, province: "" }).province).toBe(
      "checkout.errors.province"
    )
    expect(validateAddressForm({ ...valid, province: "Jakarta" }).province).toBe(
      "checkout.errors.province"
    )
    expect(validateAddressForm({ ...valid, province: "DKI Jakarta" })).toEqual({})
  })

  it("requires the full name and the phone", () => {
    expect(validateAddressForm({ ...valid, full_name: " ", phone: "" })).toEqual({
      full_name: "checkout.errors.required",
      phone: "checkout.errors.required",
    })
  })

  it("rejects a number that is not an Indonesian mobile number", () => {
    expect(validateAddressForm({ ...valid, phone: "0212345678" })).toEqual({
      phone: "checkout.errors.phone",
    })
  })

  it("rejects a postal code that does not have 5 digits", () => {
    expect(validateAddressForm({ ...valid, postal_code: "4011" })).toEqual({
      postal_code: "checkout.errors.postalCode",
    })
  })

  it("treats an address of only spaces and line breaks as empty", () => {
    expect(validateAddressForm({ ...valid, address_1: " \n \n" })).toEqual({
      address_1: "checkout.errors.required",
    })
  })
})

describe("fromCustomerAddress", () => {
  it("gives an empty string for each null field and keeps the line breaks", () => {
    expect(fromCustomerAddress(savedAddress)).toEqual({
      address_name: "",
      full_name: "Sari Dewi",
      phone: "",
      address_1: "Jl. Melati No. 12\nRT 03/RW 05",
      city: "Jakarta Pusat",
      province: "",
      postal_code: "",
    })
  })

  it("selects the list province of a saved address and joins the name", () => {
    const values = fromCustomerAddress({
      ...savedAddress,
      first_name: "Sari",
      last_name: "Wulandari",
      province: "dki jakarta",
    } as never)
    expect(values.full_name).toBe("Sari Wulandari")
    expect(values.province).toBe("DKI Jakarta")
  })

  it("gives an empty province for a province that is not in the list", () => {
    expect(fromCustomerAddress({ ...savedAddress, province: "West Java" } as never).province).toBe(
      ""
    )
  })
})

const form = {
  address_name: "  ",
  full_name: " Sari  Dewi ",
  phone: "+62 812-3456-7890",
  address_1: "Jl. Melati No. 12  \r\nRT 03/RW 05\n\n  Kel. Menteng  ",
  city: "Jakarta Pusat",
  province: "DKI Jakarta",
  postal_code: "10310",
}

describe("oneLine", () => {
  it("joins the non-empty lines with a comma and leaves out the blank lines", () => {
    expect(oneLine(form.address_1)).toBe("Jl. Melati No. 12, RT 03/RW 05, Kel. Menteng")
  })
})

describe("addressLine", () => {
  it("gives the address, the city, the province, and the postal code on one line", () => {
    expect(addressLine(form)).toBe(
      "Jl. Melati No. 12, RT 03/RW 05, Kel. Menteng, Jakarta Pusat, DKI Jakarta 10310"
    )
  })

  it("leaves out an empty province", () => {
    expect(addressLine({ ...form, province: "" })).toBe(
      "Jl. Melati No. 12, RT 03/RW 05, Kel. Menteng, Jakarta Pusat 10310"
    )
  })
})

describe("toCartAddress", () => {
  it("gives a trimmed one-line address for Indonesia with the normalized phone", () => {
    expect(toCartAddress(form)).toEqual({
      first_name: "Sari",
      last_name: "Dewi",
      address_1: "Jl. Melati No. 12, RT 03/RW 05, Kel. Menteng",
      city: "Jakarta Pusat",
      province: "DKI Jakarta",
      postal_code: "10310",
      country_code: "id",
      phone: "+6281234567890",
    })
  })
})

describe("toCustomerAddressBody", () => {
  it("keeps the line breaks, stores a blank label as null, and sets the default flag", () => {
    expect(toCustomerAddressBody(form, true)).toEqual({
      address_name: null,
      first_name: "Sari",
      last_name: "Dewi",
      phone: "+6281234567890",
      address_1: "Jl. Melati No. 12\nRT 03/RW 05\nKel. Menteng",
      city: "Jakarta Pusat",
      province: "DKI Jakarta",
      postal_code: "10310",
      country_code: "id",
      is_default_shipping: true,
    })
  })

  it("keeps a label", () => {
    expect(toCustomerAddressBody({ ...form, address_name: " Kantor " }, false)).toMatchObject({
      address_name: "Kantor",
      is_default_shipping: false,
    })
  })
})

describe("full name split", () => {
  it("splits the full name for the cart and for the account", () => {
    expect(toCartAddress({ ...valid, full_name: "Muhammad Rizky Pratama" })).toMatchObject({
      first_name: "Muhammad Rizky",
      last_name: "Pratama",
      country_code: "id",
    })
    expect(toCustomerAddressBody({ ...valid, full_name: "Sukarno" }, false)).toMatchObject({
      first_name: "Sukarno",
      last_name: "",
    })
  })
})

describe("sortAddresses", () => {
  it("puts the default address first, then the oldest, and does not change the input", () => {
    const input = [
      { id: "b", is_default_shipping: false, created_at: "2026-10-02T00:00:00Z" },
      { id: "c", is_default_shipping: true, created_at: "2026-10-03T00:00:00Z" },
      { id: "a", is_default_shipping: false, created_at: "2026-10-01T00:00:00Z" },
    ] as HttpTypes.StoreCustomerAddress[]

    expect(sortAddresses(input).map((address) => address.id)).toEqual(["c", "a", "b"])
    expect(input.map((address) => address.id)).toEqual(["b", "c", "a"])
  })
})
