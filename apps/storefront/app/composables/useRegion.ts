import type { HttpTypes } from "@medusajs/types"
import type { Ref } from "vue"

// Returns the one region of the store. The state keeps the region for the server and the browser.
export function useRegion(): {
  region: Ref<HttpTypes.StoreRegion | null>
  ensureRegion(): Promise<HttpTypes.StoreRegion>
} {
  const sdk = useMedusa()
  const region = useState<HttpTypes.StoreRegion | null>("region", () => null)

  async function ensureRegion(): Promise<HttpTypes.StoreRegion> {
    if (region.value) {
      return region.value
    }

    const { regions } = await sdk.store.region.list({ limit: 1 })
    const first = regions[0]
    if (!first) {
      throw new Error("The store has no region. Run the seed: pnpm --filter @store/backend seed.")
    }

    region.value = first
    return first
  }

  return { region, ensureRegion }
}
