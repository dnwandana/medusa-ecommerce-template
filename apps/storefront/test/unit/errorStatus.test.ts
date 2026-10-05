import { describe, expect, it } from "vitest"
import { errorStatus } from "../../app/utils/errorStatus"

describe("errorStatus", () => {
  it("returns the numeric status of an SDK error", () => {
    expect(errorStatus({ status: 404, message: "Not found" })).toBe(404)
  })

  it("returns undefined for an error with no status", () => {
    expect(errorStatus(new TypeError("Failed to fetch"))).toBeUndefined()
  })

  it("returns undefined for a status that is not a number", () => {
    expect(errorStatus({ status: "404" })).toBeUndefined()
  })

  it("returns undefined for a value that is not an object", () => {
    expect(errorStatus(null)).toBeUndefined()
    expect(errorStatus("HTTP 500")).toBeUndefined()
  })
})
