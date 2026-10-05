import type { HttpTypes } from "@medusajs/types"
import { errorStatus } from "./errorStatus"

export const RETURN_RETRIES = 5
export const RETURN_DELAY_MS = 2000

export type CompletionResult =
  | { status: "order"; order: HttpTypes.StoreOrder }
  | { status: "pending" }
  | { status: "failed" }

export type CompletionOptions = {
  complete: () => Promise<HttpTypes.StoreCompleteCartResponse>
  wait: (ms: number) => Promise<void>
  retries?: number
  delayMs?: number
}

// Completes the cart and tries again while the webhook can still arrive.
export async function completeCartWithRetry(
  options: CompletionOptions
): Promise<CompletionResult> {
  const retries = options.retries ?? RETURN_RETRIES
  const delayMs = options.delayMs ?? RETURN_DELAY_MS

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const result = await options.complete()
      if (result.type === "order") {
        return { status: "order", order: result.order }
      }
    } catch (error) {
      // A 409 conflict or an error with no status (a network failure) can go away. Try again.
      const status = errorStatus(error)
      if (status !== undefined && status !== 409) {
        return { status: "failed" }
      }
    }

    if (attempt < retries) {
      await options.wait(delayMs)
    }
  }

  return { status: "pending" }
}
