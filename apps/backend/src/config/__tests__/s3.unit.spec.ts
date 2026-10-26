import { s3ClientOptions } from "../s3"

describe("s3ClientOptions", () => {
  it("uses path-style URLs for an absent or empty S3_FORCE_PATH_STYLE", () => {
    const expected = {
      forcePathStyle: true,
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    }
    expect(s3ClientOptions({})).toEqual(expected)
    expect(s3ClientOptions({ S3_FORCE_PATH_STYLE: "" })).toEqual(expected)
    expect(s3ClientOptions({ S3_FORCE_PATH_STYLE: "true" })).toEqual(expected)
  })

  it("turns path-style URLs off for false", () => {
    expect(s3ClientOptions({ S3_FORCE_PATH_STYLE: "false" }).forcePathStyle).toBe(false)
  })

  it.each(["TRUE", "0", "no"])("stops the start for %p", (value) => {
    expect(() => s3ClientOptions({ S3_FORCE_PATH_STYLE: value })).toThrow(/S3_FORCE_PATH_STYLE/)
  })
})
