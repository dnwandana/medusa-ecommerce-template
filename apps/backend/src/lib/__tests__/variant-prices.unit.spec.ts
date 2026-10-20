import { ContainerRegistrationKeys, Modules, QueryContext } from "@medusajs/framework/utils"
import { readVariantPrices } from "../variant-prices"

const scopeWith = (variants: unknown[], regions: { id: string }[] = [{ id: "reg_1" }]) => {
  const graph = jest.fn().mockResolvedValue({ data: variants })
  const listRegions = jest.fn().mockResolvedValue(regions)
  const registry: Record<string, unknown> = {
    [ContainerRegistrationKeys.QUERY]: { graph },
    [Modules.REGION]: { listRegions },
  }
  const scope = { resolve: (key: string) => registry[key] } as any
  return Object.assign(scope, { graph })
}

describe("readVariantPrices", () => {
  it("maps the calculated prices and null for a missing one", async () => {
    const scope = scopeWith([
      { id: "var_1", calculated_price: { calculated_amount: 150000 } },
      { id: "var_2", calculated_price: null },
    ])

    const prices = await readVariantPrices(scope, ["var_1", "var_2", "var_3"])

    expect([prices.get("var_1"), prices.get("var_2"), prices.get("var_3")]).toEqual([
      150000,
      null,
      null,
    ])
    expect(scope.graph).toHaveBeenCalledWith(
      expect.objectContaining({
        entity: "product_variant",
        filters: { id: ["var_1", "var_2", "var_3"] },
        context: {
          calculated_price: QueryContext({ region_id: "reg_1", currency_code: "idr" }),
        },
      })
    )
  })

  it("converts a BigNumber-like amount to a number", async () => {
    const scope = scopeWith([{ id: "var_1", calculated_price: { calculated_amount: "99000" } }])
    const prices = await readVariantPrices(scope, ["var_1"])
    expect(prices.get("var_1")).toBe(99000)
  })

  it("gives null prices without a region and no query for an empty list", async () => {
    const noRegion = scopeWith([], [])
    const prices = await readVariantPrices(noRegion, ["var_1"])
    expect(prices.get("var_1")).toBeNull()
    expect(noRegion.graph).not.toHaveBeenCalled()

    const empty = scopeWith([])
    await expect(readVariantPrices(empty, [])).resolves.toEqual(new Map())
    expect(empty.graph).not.toHaveBeenCalled()
  })
})
