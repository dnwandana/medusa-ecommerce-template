import WeightShippingProviderService from "../service"

const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() } as any
const makeService = (ratePerKg = 10000) =>
  new WeightShippingProviderService({ logger }, { ratePerKg })

describe("WeightShippingProviderService", () => {
  it("has the identifier weight-shipping", () => {
    expect(WeightShippingProviderService.identifier).toBe("weight-shipping")
  })

  it("returns one fulfillment option", async () => {
    await expect(makeService().getFulfillmentOptions()).resolves.toEqual([
      { id: "weight-shipping" },
    ])
  })

  it("can calculate a price", async () => {
    await expect(makeService().canCalculate({} as any)).resolves.toBe(true)
  })

  it("calculates the price from the cart items in the context", async () => {
    const context = {
      items: [
        { quantity: 1, variant: { weight: 1200 } },
        { quantity: 2, variant: { weight: null } },
      ],
    } as any
    // 1200 g + 2 x 1000 g = 3200 g = 4 kg.
    await expect(makeService().calculatePrice({}, {}, context)).resolves.toEqual({
      calculated_amount: 40000,
      is_calculated_price_tax_inclusive: true,
    })
  })

  it("uses the 1 kg minimum when the context has no items", async () => {
    const result = await makeService().calculatePrice({}, {}, {} as any)
    expect(result.calculated_amount).toBe(10000)
  })

  it("uses the rate from its options", async () => {
    const context = { items: [{ quantity: 1, variant: { weight: 300 } }] } as any
    const result = await makeService(15000).calculatePrice({}, {}, context)
    expect(result.calculated_amount).toBe(15000)
  })

  it("accepts all options and all fulfillment data", async () => {
    await expect(makeService().validateOption({})).resolves.toBe(true)
    await expect(
      makeService().validateFulfillmentData({}, { note: "x" }, {} as any)
    ).resolves.toEqual({ note: "x" })
  })

  it("creates and cancels a fulfillment with no external call", async () => {
    await expect(makeService().createFulfillment({}, [], undefined, {})).resolves.toEqual({
      data: {},
      labels: [],
    })
    await expect(makeService().cancelFulfillment({})).resolves.toEqual({})
  })

  it("rejects a rate that is not a positive whole number", () => {
    expect(() => WeightShippingProviderService.validateOptions({ ratePerKg: 0 })).toThrow(
      "The ratePerKg option of weight-shipping must be a positive whole number."
    )
    expect(() => WeightShippingProviderService.validateOptions({})).toThrow()
    expect(() => WeightShippingProviderService.validateOptions({ ratePerKg: 10000 })).not.toThrow()
  })
})
