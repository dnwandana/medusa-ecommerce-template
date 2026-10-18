import type { MedusaContainer } from "@medusajs/framework/types"
import { STOREFRONT_MODULE } from "../modules/storefront"
import type StorefrontModuleService from "../modules/storefront/service"

const STORE_COLOURS = [
  { name: "Black", hex: "#1d1b18" },
  { name: "White", hex: "#f4f1eb" },
  { name: "Sage", hex: "#9aa68c" },
]

// Whole rupiah. Two limits make three price ranges in the storefront filter.
const PRICE_LIMITS = [200000, 500000]

// Creates the sample store colours and the price limits. It creates no home campaign.
export async function seedStorefront(container: MedusaContainer): Promise<void> {
  const service: StorefrontModuleService = container.resolve(STOREFRONT_MODULE)

  // The match ignores the case and the outer spaces, as the colour rule of the module does.
  const existing = new Set(
    (await service.listColours()).map((colour) => colour.name.trim().toLowerCase())
  )
  for (const colour of STORE_COLOURS) {
    if (!existing.has(colour.name.toLowerCase())) {
      await service.createColour(colour)
    }
  }

  // A second run must not overwrite the values that staff saved. Thus the seed saves the
  // settings only when the module has no settings row.
  const [row] = await service.listStorefrontSettings({}, { take: 1 })
  if (!row) {
    const defaults = await service.getSettings()
    await service.saveSettings({ ...defaults, price_limits: PRICE_LIMITS })
  }
}
