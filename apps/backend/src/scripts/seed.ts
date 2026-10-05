import type { ExecArgs } from "@medusajs/framework/types"
import { runSeed } from "../seed"

// Entry for `medusa exec`. The developer copies the key from the PUBLISHABLE_KEY line, so this
// line goes to the standard output without a log prefix.
export default async function seed({ container }: ExecArgs): Promise<void> {
  const { publishableKey } = await runSeed(container)
  console.log(`PUBLISHABLE_KEY=${publishableKey}`)
}
