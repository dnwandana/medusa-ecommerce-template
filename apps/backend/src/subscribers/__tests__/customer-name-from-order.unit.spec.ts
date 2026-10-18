import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import handler, { config } from "../customer-name-from-order"

const makeContainer = (order: Record<string, unknown> | undefined) => {
  const updateCustomers = jest.fn().mockResolvedValue({})
  const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() }
  const graph = jest.fn().mockResolvedValue({ data: order ? [order] : [] })
  const registry: Record<string, unknown> = {
    [ContainerRegistrationKeys.LOGGER]: logger,
    [ContainerRegistrationKeys.QUERY]: { graph },
    [Modules.CUSTOMER]: { updateCustomers },
  }
  return { container: { resolve: (key: string) => registry[key] } as any, updateCustomers, logger }
}

const order = (customer: object, address: object) => ({
  id: "order_1",
  customer_id: "cus_1",
  customer,
  shipping_address: address,
})

const run = (container: any) =>
  handler({
    event: { name: "order.placed", data: { id: "order_1" } },
    container,
    pluginOptions: {},
  } as any)

describe("customer-name-from-order subscriber", () => {
  it("listens to order.placed", () => {
    expect(config.event).toBe("order.placed")
  })

  it("copies the address name into a profile with no name", async () => {
    const { container, updateCustomers } = makeContainer(
      order(
        { first_name: null, last_name: "" },
        { first_name: " Muhammad Rizky ", last_name: "Pratama" }
      )
    )
    await run(container)
    expect(updateCustomers).toHaveBeenCalledWith("cus_1", {
      first_name: "Muhammad Rizky",
      last_name: "Pratama",
    })
  })

  it("stores a one-word name with no last name", async () => {
    const { container, updateCustomers } = makeContainer(
      order({ first_name: null, last_name: null }, { first_name: "Sari", last_name: "" })
    )
    await run(container)
    expect(updateCustomers).toHaveBeenCalledWith("cus_1", { first_name: "Sari", last_name: null })
  })

  it.each([
    [
      "a profile with a first name",
      { first_name: "Budi", last_name: null },
      { first_name: "Sari", last_name: "W" },
    ],
    [
      "a profile with a last name",
      { first_name: "", last_name: "Santoso" },
      { first_name: "Sari", last_name: "W" },
    ],
    [
      "an address with no name",
      { first_name: null, last_name: null },
      { first_name: "  ", last_name: "W" },
    ],
  ])("changes nothing for %s", async (_name, customer, address) => {
    const { container, updateCustomers } = makeContainer(order(customer, address))
    await run(container)
    expect(updateCustomers).not.toHaveBeenCalled()
  })

  it("changes nothing and logs nothing for an order with no customer", async () => {
    const { container, updateCustomers, logger } = makeContainer({
      ...order({}, { first_name: "Sari", last_name: "W" }),
      customer_id: null,
      customer: null,
    })
    await run(container)
    expect(updateCustomers).not.toHaveBeenCalled()
    expect(logger.error).not.toHaveBeenCalled()
    expect(logger.warn).not.toHaveBeenCalled()
  })

  it("logs the error and does not throw", async () => {
    const { container, updateCustomers, logger } = makeContainer(
      order({ first_name: null, last_name: null }, { first_name: "Sari" })
    )
    updateCustomers.mockRejectedValue(new Error("db down"))
    await expect(run(container)).resolves.toBeUndefined()
    expect(logger.error).toHaveBeenCalledWith(
      "The customer name was not copied from order order_1. Cause: db down"
    )
  })
})
