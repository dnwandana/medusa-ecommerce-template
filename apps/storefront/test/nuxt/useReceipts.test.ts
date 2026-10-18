import { mockNuxtImport } from "@nuxt/test-utils/runtime"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { useReceipts } from "#imports"

const { sdk } = vi.hoisted(() => ({ sdk: { client: { fetch: vi.fn() } } }))

mockNuxtImport("useMedusa", () => () => sdk)

const fetch = sdk.client.fetch

beforeEach(() => {
  fetch.mockReset()
})

describe("useReceipts", () => {
  it("posts the file as base64 with its name", async () => {
    fetch.mockResolvedValue({
      receipt: { id: "prcpt_1", file_name: "a.png", created_at: "2026-10-18T02:00:00Z" },
    })
    const file = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47])], "a.png", {
      type: "image/png",
    })

    const receipt = await useReceipts().uploadReceipt("order_1", file)

    expect(fetch).toHaveBeenCalledWith("/store/orders/order_1/receipts", {
      method: "POST",
      body: { file_name: "a.png", content: "iVBORw==" },
    })
    expect(receipt.id).toBe("prcpt_1")
  })

  it("encodes a file that is larger than one chunk", async () => {
    fetch.mockResolvedValue({ receipt: { id: "prcpt_2", file_name: "b.png", created_at: "x" } })
    const bytes = new Uint8Array(100_000).map((_, index) => index % 256)
    const file = new File([bytes], "b.png", { type: "image/png" })

    await useReceipts().uploadReceipt("order_1", file)

    const content = fetch.mock.calls[0]![1].body.content as string
    expect(content).toBe(Buffer.from(bytes).toString("base64"))
  })

  it("throws the SDK error as it is", async () => {
    const error = Object.assign(new Error("full"), { status: 400 })
    fetch.mockRejectedValue(error)
    const file = new File([new Uint8Array([1])], "a.png", { type: "image/png" })

    await expect(useReceipts().uploadReceipt("order_1", file)).rejects.toBe(error)
  })

  it("asks the payment states in groups of 50", async () => {
    fetch.mockResolvedValueOnce({ payment_states: [{ order_id: "o0" }] })
    fetch.mockResolvedValueOnce({ payment_states: [{ order_id: "o50" }] })

    const states = await useReceipts().getPaymentStates(
      Array.from({ length: 51 }, (_, index) => `o${index}`)
    )

    expect(fetch).toHaveBeenCalledTimes(2)
    expect(fetch.mock.calls[0]![1].query.order_id.split(",")).toHaveLength(50)
    expect(fetch.mock.calls[1]).toEqual(["/store/payment-states", { query: { order_id: "o50" } }])
    expect(states.map((state) => state.order_id)).toEqual(["o0", "o50"])
  })

  it("makes no request with no id", async () => {
    expect(await useReceipts().getPaymentStates([])).toEqual([])
    expect(fetch).not.toHaveBeenCalled()
  })
})
