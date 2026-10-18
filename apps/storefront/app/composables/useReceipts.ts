import type { OrderPaymentState } from "~/utils/orderStatus"

export type UploadedReceipt = { id: string; file_name: string; created_at: string }

// The payment state route takes at most 50 order ids in one request.
const PAYMENT_STATE_BATCH = 50

// `String.fromCharCode` takes each byte as one argument. Small chunks keep a 5 MB file below the
// argument limit of the call stack.
const BASE64_CHUNK = 32 * 1024

function toBase64(bytes: Uint8Array): string {
  let binary = ""
  for (let start = 0; start < bytes.length; start += BASE64_CHUNK) {
    binary += String.fromCharCode(...bytes.subarray(start, start + BASE64_CHUNK))
  }
  return btoa(binary)
}

// Returns the functions that upload a receipt and read the payment state of orders.
export function useReceipts(): {
  uploadReceipt(orderId: string, file: File): Promise<UploadedReceipt>
  getPaymentStates(orderIds: string[]): Promise<OrderPaymentState[]>
} {
  // The SDK client keeps the locale header of the time it was made. Each call makes a new client
  // in the Nuxt context, because the Nuxt context is not available after an await.
  const nuxtApp = useNuxtApp()
  const client = () => nuxtApp.runWithContext(() => useMedusa())

  // The backend takes JSON with the file as base64, because the SDK sends JSON.
  async function uploadReceipt(orderId: string, file: File): Promise<UploadedReceipt> {
    const sdk = client()
    const content = toBase64(new Uint8Array(await file.arrayBuffer()))
    const { receipt } = await sdk.client.fetch<{ receipt: UploadedReceipt }>(
      `/store/orders/${orderId}/receipts`,
      { method: "POST", body: { file_name: file.name, content } }
    )
    return receipt
  }

  async function getPaymentStates(orderIds: string[]): Promise<OrderPaymentState[]> {
    if (orderIds.length === 0) return []
    const sdk = client()
    const batches: string[][] = []
    for (let start = 0; start < orderIds.length; start += PAYMENT_STATE_BATCH) {
      batches.push(orderIds.slice(start, start + PAYMENT_STATE_BATCH))
    }
    const answers = await Promise.all(
      batches.map((ids) =>
        sdk.client.fetch<{ payment_states: OrderPaymentState[] }>("/store/payment-states", {
          query: { order_id: ids.join(",") },
        })
      )
    )
    return answers.flatMap((answer) => answer.payment_states)
  }

  return { uploadReceipt, getPaymentStates }
}
