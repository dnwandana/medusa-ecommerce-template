import {
  buildCatalogFilters,
  containsPattern,
  idList,
  translatedLabels,
  type FilterProduct,
} from "../catalog-filters"

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

describe("translated labels", () => {
  const products: FilterProduct[] = [
    {
      options: [{ title: "Colour", values: [{ id: "ov_w", value: "White" }] }],
      tags: [{ id: "tag_c", value: "Fabric: Cotton" }],
    },
  ]

  it("takes the label from the translation and the key from the original value", () => {
    const labels = new Map([
      ["ov_w", "Putih"],
      ["tag_c", "Katun"],
    ])
    expect(buildCatalogFilters(products, labels)).toEqual({
      sizes: [],
      colours: [{ key: "white", label: "Putih", ids: ["ov_w"] }],
      fabrics: [{ key: "cotton", label: "Katun", ids: ["tag_c"] }],
    })
  })

  it("keeps the original label with no translation", () => {
    expect(buildCatalogFilters(products).colours).toEqual([
      { key: "white", label: "White", ids: ["ov_w"] },
    ])
    expect(buildCatalogFilters(products, new Map()).fabrics).toEqual([
      { key: "cotton", label: "Cotton", ids: ["tag_c"] },
    ])
  })

  it("merges values with the same original key, and the first value gives the label", () => {
    const merged = buildCatalogFilters(
      [
        ...products,
        { options: [{ title: "Colour", values: [{ id: "ov_w2", value: "white" }] }], tags: null },
      ],
      new Map([
        ["ov_w", "Putih"],
        ["ov_w2", "Putih bersih"],
      ])
    )
    expect(merged.colours).toEqual([{ key: "white", label: "Putih", ids: ["ov_w", "ov_w2"] }])
  })

  it("reads the labels of translated products, and only fabric tags with the prefix", () => {
    const translated: FilterProduct[] = [
      {
        options: [{ title: "Corak", values: [{ id: "ov_w", value: "Putih" }] }],
        tags: [
          { id: "tag_c", value: "Fabric: Katun" },
          { id: "tag_x", value: "Kain: Linen" },
        ],
      },
    ]
    expect(translatedLabels(translated)).toEqual(
      new Map([
        ["ov_w", "Putih"],
        ["tag_c", "Katun"],
      ])
    )
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
