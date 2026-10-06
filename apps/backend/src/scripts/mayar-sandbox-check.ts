import type { ExecArgs } from "@medusajs/framework/types"
import { MayarClient } from "../modules/mayar/client"

const ONE_HOUR_MS = 60 * 60 * 1000

// Creates one invoice in the Mayar sandbox, reads it, and closes it. It prints each response, so
// that the developer can record the facts in docs/mayar-sandbox-check.md.
export default async function mayarSandboxCheck(_args: ExecArgs): Promise<void> {
  const apiUrl = process.env.MAYAR_API_URL ?? ""
  const apiKey = process.env.MAYAR_API_KEY ?? ""

  if (!apiKey) {
    console.log("MAYAR_API_KEY is empty. Add a sandbox key to apps/backend/.env.")
    return
  }

  // Stop on a URL that is not the sandbox URL. This prevents an invoice on the live account.
  if (!apiUrl.includes("mayar.io")) {
    console.log("This script runs only against the sandbox (api.mayar.io).")
    return
  }

  const client = new MayarClient({ apiUrl, apiKey })

  // Use console.log for the output, because the developer reads it directly.
  try {
    const created = await client.createInvoice({
      name: "Sandbox Check",
      email: "sandbox-check@example.com",
      mobile: "081234567890",
      description: "Sandbox check",
      redirectUrl: "http://localhost:3000/checkout/return",
      expiredAt: new Date(Date.now() + ONE_HOUR_MS).toISOString(),
      items: [{ quantity: 1, rate: 10000, description: "Sandbox check" }],
      extraData: { session_id: "payses_sandbox_check" },
    })
    console.log(`CREATE: ${JSON.stringify(created)}`)

    const detail = await client.getInvoice(created.id)
    console.log(`DETAIL: ${JSON.stringify(detail)}`)

    await client.closeInvoice(created.id)
    console.log("CLOSE: success")

    const afterClose = await client.getInvoice(created.id)
    console.log(`STATUS AFTER CLOSE: ${afterClose?.status}`)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.log(`FAILED: ${message}`)
  }
}
