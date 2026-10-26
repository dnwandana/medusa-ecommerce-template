import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { cancelOrderWorkflow } from "@medusajs/medusa/core-flows"
import { BANK_TRANSFER_PROVIDER_ID } from "../../modules/bank-transfer/constants"
import { PAYMENT_RECEIPT_MODULE } from "../../modules/payment-receipt"
import { runPaymentTimeout } from "../run"

// run.ts imports the receipt route, and that route builds a workflow from the other core flows.
jest.mock("@medusajs/medusa/core-flows", () => ({
  ...jest.requireActual("@medusajs/medusa/core-flows"),
  cancelOrderWorkflow: jest.fn(),
}))

const NOW = new Date("2026-10-20T12:00:00Z")

// The order is two days old, so the 24 hour deadline is passed.
const order = {
  id: "order_1",
  status: "pending",
  display_id: 1042,
  created_at: "2026-10-18T12:00:00Z",
  metadata: { a: 1 },
  payment_collections: [
    {
      status: "authorized",
      payment_sessions: [{ provider_id: BANK_TRANSFER_PROVIDER_ID }],
      payments: [
        {
          id: "pay_1",
          provider_id: BANK_TRANSFER_PROVIDER_ID,
          captured_at: null,
          canceled_at: null,
        },
      ],
    },
  ],
}

const graph = jest.fn(async () => ({ data: [order] }))
const run = jest.fn()
const updateOrders = jest.fn()
const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() }

const registry: Record<string, unknown> = {
  [ContainerRegistrationKeys.LOGGER]: logger,
  [ContainerRegistrationKeys.QUERY]: { graph },
  [PAYMENT_RECEIPT_MODULE]: {
    listPaymentReceipts: jest.fn().mockResolvedValue([]),
    countReceipts: jest.fn().mockResolvedValue(0),
  },
  [Modules.ORDER]: { updateOrders },
  [Modules.LOCKING]: { execute: (_key: string, fn: () => Promise<unknown>) => fn() },
}
const container = { resolve: (key: string) => registry[key] } as any

beforeEach(() => {
  jest.clearAllMocks()
  jest.mocked(cancelOrderWorkflow).mockReturnValue({ run } as any)
})

describe("runPaymentTimeout", () => {
  it("writes the reason before the cancel and keeps it", async () => {
    run.mockResolvedValue({})
    const result = await runPaymentTimeout(container, NOW)
    expect(result).toEqual({ cancelled: ["order_1"], failed: [] })
    expect(run).toHaveBeenCalledWith({ input: { order_id: "order_1" } })
    expect(updateOrders).toHaveBeenCalledTimes(1)
    expect(updateOrders.mock.invocationCallOrder[0]).toBeLessThan(run.mock.invocationCallOrder[0])
    expect(updateOrders).toHaveBeenCalledWith("order_1", {
      metadata: { a: 1, cancel_reason: "payment_timeout" },
    })
  })

  it("removes the reason when the cancel fails", async () => {
    run.mockRejectedValue(new Error("boom"))
    const result = await runPaymentTimeout(container, NOW)
    expect(result.failed).toEqual(["order_1"])
    expect(result.cancelled).toEqual([])
    expect(updateOrders).toHaveBeenCalledTimes(2)
    // Medusa merges the metadata, so only the value "" removes the key.
    expect(updateOrders).toHaveBeenLastCalledWith("order_1", { metadata: { cancel_reason: "" } })
    expect(logger.error).toHaveBeenCalledWith(
      "The payment timeout did not cancel order order_1. Cause: boom"
    )
  })

  it("reads the deadline from BANK_TRANSFER_DEADLINE_HOURS", async () => {
    const saved = process.env.BANK_TRANSFER_DEADLINE_HOURS
    process.env.BANK_TRANSFER_DEADLINE_HOURS = "48"
    try {
      run.mockResolvedValue({})
      await runPaymentTimeout(container, NOW)
      const [{ filters }] = graph.mock.calls[0] as unknown as [
        { filters: { created_at: { $lte: Date } } },
      ]
      expect(filters.created_at.$lte).toEqual(new Date(NOW.getTime() - 48 * 60 * 60 * 1000))
    } finally {
      if (saved === undefined) {
        delete process.env.BANK_TRANSFER_DEADLINE_HOURS
      } else {
        process.env.BANK_TRANSFER_DEADLINE_HOURS = saved
      }
    }
  })
})
