import type { AuthenticatedMedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import { z } from "@medusajs/framework/zod"
import { createFindParams } from "@medusajs/medusa/api/utils/validators"
import { STOREFRONT_MODULE } from "../../../modules/storefront"
import { isStorePath } from "../../../modules/storefront/campaign-rules"
import {
  HOME_CAMPAIGN_LINK_TYPES,
  HOME_CAMPAIGN_STATUSES,
} from "../../../modules/storefront/models/home-campaign"
import type StorefrontModuleService from "../../../modules/storefront/service"

const requiredText = z.string().trim().min(1)
const optionalText = z.string().trim().nullable().optional()

// The storefront shows the image in an img element, so only a web address is allowed.
const isWebUrl = (value: string): boolean => {
  try {
    return ["http:", "https:"].includes(new URL(value).protocol)
  } catch {
    return false
  }
}
const WEB_URL_MESSAGE = "Enter an image URL that starts with http:// or https://."

// The body has no status and no dates. Only the action routes change them.
export const HomeCampaignFieldsSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    image_url: z.string().trim().refine(isWebUrl, { message: WEB_URL_MESSAGE }),
    mobile_image_url: optionalText,
    eyebrow_en: optionalText,
    eyebrow_id: optionalText,
    title_en: requiredText,
    title_id: requiredText,
    text_en: optionalText,
    text_id: optionalText,
    button_label_en: requiredText,
    button_label_id: requiredText,
    link_type: z.enum(HOME_CAMPAIGN_LINK_TYPES),
    link_category_id: optionalText,
    link_path: optionalText,
  })
  .strict()

// Returns null for a missing or blank value.
const blankToNull = (value: string | null | undefined): string | null => (value ? value : null)

// The full body of a create or an update. The transform clears the link field that the link type
// does not use, so that an old value cannot come back when staff change the type again.
export const PostAdminHomeCampaignSchema = HomeCampaignFieldsSchema.superRefine((body, ctx) => {
  if (body.mobile_image_url && !isWebUrl(body.mobile_image_url)) {
    ctx.addIssue({ code: "custom", message: WEB_URL_MESSAGE, path: ["mobile_image_url"] })
  }
  if (body.link_type === "category" && !body.link_category_id) {
    ctx.addIssue({ code: "custom", message: "Select a category.", path: ["link_category_id"] })
  }
  if (body.link_type === "path" && !isStorePath(body.link_path ?? "")) {
    ctx.addIssue({
      code: "custom",
      message: "Enter a path that starts with /.",
      path: ["link_path"],
    })
  }
}).transform((body) => ({
  ...body,
  mobile_image_url: blankToNull(body.mobile_image_url),
  eyebrow_en: blankToNull(body.eyebrow_en),
  eyebrow_id: blankToNull(body.eyebrow_id),
  text_en: blankToNull(body.text_en),
  text_id: blankToNull(body.text_id),
  link_category_id: body.link_type === "category" ? blankToNull(body.link_category_id) : null,
  link_path: body.link_type === "path" ? blankToNull(body.link_path) : null,
}))

export type PostAdminHomeCampaignBody = z.infer<typeof PostAdminHomeCampaignSchema>

export const GetAdminHomeCampaignsSchema = createFindParams({ limit: 20, offset: 0 }).merge(
  z.object({
    status: z.enum(HOME_CAMPAIGN_STATUSES).optional(),
    q: z.string().trim().optional(),
  })
)

// Escapes the wildcards of ILIKE, so that "%" and "_" in the search text match only themselves.
const escapeLike = (value: string): string => value.replace(/[\\%_]/g, "\\$&")

// Returns a page of the home campaigns, the last changed campaign first. q matches a part of the
// name and ignores the case.
// Medusa lets only a logged-in admin user use a route below /admin.
export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> => {
  const service: StorefrontModuleService = req.scope.resolve(STOREFRONT_MODULE)
  const { status, q } = req.filterableFields as { status?: string; q?: string }
  const { skip, take } = req.queryConfig.pagination

  const filters: Record<string, unknown> = {}
  if (status) {
    filters.status = status
  }
  if (q) {
    filters.name = { $ilike: `%${escapeLike(q)}%` }
  }

  const [home_campaigns, count] = await service.listAndCountHomeCampaigns(filters, {
    skip,
    take,
    order: { updated_at: "DESC", id: "DESC" },
  })

  res.json({ home_campaigns, count, limit: take, offset: skip })
}

// Creates a draft home campaign. The route creates one row of one module, so it calls the
// service.
export const POST = async (
  req: AuthenticatedMedusaRequest<PostAdminHomeCampaignBody>,
  res: MedusaResponse
): Promise<void> => {
  const service: StorefrontModuleService = req.scope.resolve(STOREFRONT_MODULE)

  res.json({ home_campaign: await service.createHomeCampaigns(req.validatedBody) })
}
