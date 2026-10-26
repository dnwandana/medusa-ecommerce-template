import type { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { knownSocialLinks } from "../../../../lib/social-networks"
import { STOREFRONT_MODULE } from "../../../../modules/storefront"
import type StorefrontModuleService from "../../../../modules/storefront/service"

// Returns the storefront settings, the store colours, and the store contact. The values are the
// defaults when staff saved no settings. The colours have no id, because the storefront matches a
// colour by its name. The contact has only the links of a known network, because the storefront
// has no icon for an unknown network. The route needs only the publishable API key.
export const GET = async (req: MedusaRequest, res: MedusaResponse): Promise<void> => {
  const service: StorefrontModuleService = req.scope.resolve(STOREFRONT_MODULE)

  const [settings, colours, contact] = await Promise.all([
    service.getSettings(),
    service.listColours(),
    service.getContact(),
  ])

  res.json({
    new_badge_days: settings.new_badge_days,
    low_stock_threshold: settings.low_stock_threshold,
    colours: colours.map(({ name, hex }) => ({ name, hex })),
    price_limits: settings.price_limits,
    contact: { ...contact, social_links: knownSocialLinks(contact.social_links) },
  })
}
