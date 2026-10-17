import type { HttpTypes } from "@medusajs/types"
import { describe, expect, it } from "vitest"
import {
  addressLine,
  emptyAddressForm,
  fromCustomerAddress,
  oneLine,
  sortAddresses,
  toCartAddress,
  toCustomerAddressBody,
  validateAddressForm,
} from "../../app/utils/addressForm"

const valid = {
  address_name: "",
  first_name: "Sari",
  last_name: "Dewi",
  phone: "+62 812-3456-7890",
  address_1: "Jl. Melati No. 12\nRT 03/RW 05",
  city: "Jakarta Pusat",
  province: "",
  postal_code: "10310",
}

describe("validateAddressForm", () => {
  it("requires the names, the phone, the address, the city, and the postal code", () => {
    const required = "checkout.errors.required"
    expect(validateAddressForm(emptyAddressForm(), { phone: true })).toEqual({
      first_name: required,
      last_name: required,
      phone: required,
      address_1: required,
      city: required,
      postal_code: required,
    })
  })

  it("accepts a form with no label and no province", () => {
    expect(validateAddressForm(valid, { phone: true })).toEqual({})
  })

  it("does not check the phone when the form has no phone field", () => {
    expect(validateAddressForm({ ...valid, phone: "" }, { phone: false })).toEqual({})
  })

  it("rejects a number that is not an Indonesian mobile number", () => {
    expect(validateAddressForm({ ...valid, phone: "0212345678" }, { phone: true })).toEqual({
      phone: "checkout.errors.phone",
    })
  })

  it("rejects a postal code that does not have 5 digits", () => {
    expect(validateAddressForm({ ...valid, postal_code: "4011" }, { phone: true })).toEqual({
      postal_code: "checkout.errors.postalCode",
    })
  })

  it("treats an address of only spaces and line breaks as empty", () => {
    expect(validateAddressForm({ ...valid, address_1: " \n \n" }, { phone: true })).toEqual({
      address_1: "checkout.errors.required",
    })
  })
})

describe("fromCustomerAddress", () => {
  it("gives an empty string for each null field and keeps the line breaks", () => {
    const address = {
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

    expect(fromCustomerAddress(address)).toEqual({
      address_name: "",
      first_name: "Sari",
      last_name: "Dewi",
      phone: "",
      address_1: "Jl. Melati No. 12\nRT 03/RW 05",
      city: "Jakarta Pusat",
      province: "",
      postal_code: "",
    })
  })
})

const form = {
  address_name: "  ",
  first_name: " Sari ",
  last_name: "Dewi",
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
