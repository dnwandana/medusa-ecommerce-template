import { buildCatalogFilters, containsPattern, idList } from "../catalog-filters"

describe("buildCatalogFilters", () => {
  it("merges values with the same name across products", () => {
    const result = buildCatalogFilters([
      {
        options: [
          { title: "Colour", values: [{ id: "ov_1", value: "Sage" }] },
          {
            title: "Size",
            values: [
              { id: "ov_2", value: "L" },
              { id: "ov_3", value: "S" },
            ],
          },
        ],
        tags: [
          { id: "tag_1", value: "Fabric: Linen" },
          { id: "tag_2", value: "summer" },
        ],
      },
      {
        options: [
          {
            title: "warna",
            values: [
              { id: "ov_4", value: "sage " },
              { id: "ov_5", value: "Ink" },
            ],
          },
          {
            title: "Ukuran",
            values: [
              { id: "ov_6", value: "42" },
              { id: "ov_7", value: "M" },
            ],
          },
        ],
        tags: null,
      },
    ])
    expect(result).toEqual({
      sizes: [
        { key: "s", label: "S", ids: ["ov_3"] },
        { key: "m", label: "M", ids: ["ov_7"] },
        { key: "l", label: "L", ids: ["ov_2"] },
        { key: "42", label: "42", ids: ["ov_6"] },
      ],
      colours: [
        { key: "ink", label: "Ink", ids: ["ov_5"] },
        { key: "sage", label: "Sage", ids: ["ov_1", "ov_4"] },
      ],
      fabrics: [{ key: "linen", label: "Linen", ids: ["tag_1"] }],
    })
  })

  it("orders the sizes by the size list, then by number, then A to Z", () => {
    const sizes = (values: string[]) =>
      buildCatalogFilters([
        {
          options: [
            { title: "Size", values: values.map((value, i) => ({ id: `ov_${i}`, value })) },
          ],
          tags: null,
        },
      ]).sizes.map((size) => size.label)
    expect(sizes(["One size", "10", "XL", "9", "xs", "Petite"])).toEqual([
      "xs",
      "XL",
      "9",
      "10",
      "One size",
      "Petite",
    ])
  })

  it("does not repeat an id and ignores other options", () => {
    const result = buildCatalogFilters([
      { options: [{ title: "Colour", values: [{ id: "ov_1", value: "Sage" }] }], tags: null },
      {
        options: [
          { title: "Colour", values: [{ id: "ov_1", value: "Sage" }] },
          { title: "Material", values: [{ id: "ov_9", value: "Wool" }] },
        ],
        tags: null,
      },
    ])
    expect(result).toEqual({
      sizes: [],
      colours: [{ key: "sage", label: "Sage", ids: ["ov_1"] }],
      fabrics: [],
    })
  })

  it("returns empty lists for no product", () => {
    expect(buildCatalogFilters([])).toEqual({ sizes: [], colours: [], fabrics: [] })
  })
})

describe("containsPattern", () => {
  it("escapes the ILIKE wildcards", () => {
    expect(containsPattern("50%_off\\")).toBe("%50\\%\\_off\\\\%")
  })
})

describe("idList", () => {
  it("reads one id, a comma list or a list, and gives an empty list for no value", () => {
    expect(idList.parse("pcat_1")).toEqual(["pcat_1"])
    expect(idList.parse("pcat_1, pcat_2,")).toEqual(["pcat_1", "pcat_2"])
    expect(idList.parse(["pcat_1", " pcat_2 "])).toEqual(["pcat_1", "pcat_2"])
    expect(idList.parse(undefined)).toEqual([])
  })
})
