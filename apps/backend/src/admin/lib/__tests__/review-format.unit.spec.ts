import { authorName, listQuery, PAGE_SIZE, statusColor } from "../review-format"

describe("statusColor", () => {
  it.each([
    ["approved", "green"],
    ["rejected", "red"],
    ["pending", "orange"],
  ] as const)("gives %s the color %s", (status, color) => {
    expect(statusColor(status)).toBe(color)
  })
})

describe("authorName", () => {
  it("joins the first name and the last name", () => {
    expect(authorName({ first_name: "Budi", last_name: "Santoso" })).toBe("Budi Santoso")
  })

  it("uses the one name that exists", () => {
    expect(authorName({ first_name: "Budi", last_name: "" })).toBe("Budi")
    expect(authorName({ first_name: "", last_name: "Santoso" })).toBe("Santoso")
  })

  it("gives a dash for no names", () => {
    expect(authorName({ first_name: "", last_name: "  " })).toBe("-")
  })
})

describe("listQuery", () => {
  it("uses a page size of 20", () => {
    expect(PAGE_SIZE).toBe(20)
  })

  it("makes the query of the first page with no status filter", () => {
    expect(listQuery(0, "all")).toEqual({ limit: 20, offset: 0 })
  })

  it("makes the query of the third page with a status filter", () => {
    expect(listQuery(2, "pending")).toEqual({ limit: 20, offset: 40, status: "pending" })
  })
})
