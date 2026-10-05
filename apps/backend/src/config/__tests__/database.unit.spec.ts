import { buildDatabaseDriverOptions } from "../database"

describe("buildDatabaseDriverOptions", () => {
  it("returns undefined when DATABASE_SSL is absent", () => {
    expect(buildDatabaseDriverOptions({})).toBeUndefined()
  })

  it("returns undefined when DATABASE_SSL is an empty string", () => {
    expect(buildDatabaseDriverOptions({ DATABASE_SSL: "" })).toBeUndefined()
  })

  it("returns undefined when DATABASE_SSL is true", () => {
    expect(buildDatabaseDriverOptions({ DATABASE_SSL: "true" })).toBeUndefined()
  })

  it("disables SSL when DATABASE_SSL is false", () => {
    expect(buildDatabaseDriverOptions({ DATABASE_SSL: "false" })).toEqual({
      ssl: false,
      sslmode: "disable",
    })
  })
})
