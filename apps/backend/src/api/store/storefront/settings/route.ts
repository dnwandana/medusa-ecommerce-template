import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { STOREFRONT_MODULE } from "../../../../modules/storefront"
import type StorefrontModuleService from "../../../../modules/storefront/service"

// Returns the storefront settings and the store colours. The values are the defaults when staff
// saved no settings. The colours have no id, because the storefront matches a colour by its name.
// The route needs only the publishable API key.
export const GET = async (req: MedusaRequest, res: MedusaResponse): Promise<void> => {
  const service: StorefrontModuleService = req.scope.resolve(STOREFRONT_MODULE)

  const [settings, colours] = await Promise.all([service.getSettings(), service.listColours()])

  res.json({
    new_badge_days: settings.new_badge_days,
    low_stock_threshold: settings.low_stock_threshold,
    colours: colours.map(({ name, hex }) => ({ name, hex })),
    price_limits: settings.price_limits,
  })
}
