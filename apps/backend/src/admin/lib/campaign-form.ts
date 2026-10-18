// The helpers of the home campaign form. This file imports nothing from src/modules, so the admin
// bundle stays small.

export type CampaignLinkType = "category" | "all_products" | "path"

export type CampaignStatus = "draft" | "live" | "ended"

/** The row of GET /admin/home-campaigns/:id. */
export type AdminHomeCampaign = {
  id: string
  name: string
  status: CampaignStatus
  image_url: string
  mobile_image_url: string | null
  eyebrow_en: string | null
  eyebrow_id: string | null
  title_en: string
  title_id: string
  text_en: string | null
  text_id: string | null
  button_label_en: string
  button_label_id: string
  link_type: CampaignLinkType
  link_category_id: string | null
  link_path: string | null
  went_live_at: string | null
  ended_at: string | null
  created_at: string
  updated_at: string
}

export type CampaignForm = {
  name: string
  image_url: string
  mobile_image_url: string
  eyebrow_en: string
  eyebrow_id: string
  title_en: string
  title_id: string
  text_en: string
  text_id: string
  button_label_en: string
  button_label_id: string
  link_type: CampaignLinkType
  link_category_id: string
  link_path: string
}

export type CampaignFormErrors = Partial<Record<keyof CampaignForm, string>>

// The fields that can be blank. The payload sends a blank optional field as null.
const OPTIONAL_FIELDS: (keyof CampaignForm)[] = [
  "mobile_image_url",
  "eyebrow_en",
  "eyebrow_id",
  "text_en",
  "text_id",
  "link_category_id",
  "link_path",
]

// The messages are the same as the messages of the Admin routes.
const REQUIRED_MESSAGES: Partial<Record<keyof CampaignForm, string>> = {
  name: "Enter a name.",
  title_en: "Enter a title.",
  title_id: "Enter a title.",
  button_label_en: "Enter a button label.",
  button_label_id: "Enter a button label.",
  image_url: "Upload an image.",
}

/** The fields of each Drawer section of the campaign page. */
export const CAMPAIGN_SECTIONS: Record<"content" | "link" | "images", (keyof CampaignForm)[]> = {
  content: [
    "name",
    "eyebrow_en",
    "eyebrow_id",
    "title_en",
    "title_id",
    "text_en",
    "text_id",
    "button_label_en",
    "button_label_id",
  ],
  link: ["link_type", "link_category_id", "link_path"],
  images: ["image_url", "mobile_image_url"],
}

/** Returns an empty form. A new campaign links to all products. */
export function emptyCampaignForm(): CampaignForm {
  return {
    name: "",
    image_url: "",
    mobile_image_url: "",
    eyebrow_en: "",
    eyebrow_id: "",
    title_en: "",
    title_id: "",
    text_en: "",
    text_id: "",
    button_label_en: "",
    button_label_id: "",
    link_type: "all_products",
    link_category_id: "",
    link_path: "",
  }
}

/** Returns the form values of a saved campaign. A null value becomes "". */
export function toCampaignForm(campaign: AdminHomeCampaign): CampaignForm {
  const form = emptyCampaignForm()
  for (const key of Object.keys(form) as (keyof CampaignForm)[]) {
    if (key === "link_type") {
      form.link_type = campaign.link_type
    } else {
      form[key] = campaign[key] ?? ""
    }
  }
  return form
}

// The simple form of the store path rule of the server: one leading "/", not "//". The server
// makes the full check.
function isPath(value: string): boolean {
  return value.startsWith("/") && !value.startsWith("//")
}

/**
 * Returns an error text for each field that the Admin routes do not accept. With `fields`, it
 * checks only those fields, for example the fields of one Drawer section.
 */
export function validateCampaignForm(
  form: CampaignForm,
  fields?: (keyof CampaignForm)[]
): CampaignFormErrors {
  const errors: CampaignFormErrors = {}
  for (const [key, message] of Object.entries(REQUIRED_MESSAGES) as [
    keyof CampaignForm,
    string,
  ][]) {
    if (!form[key].trim()) {
      errors[key] = message
    }
  }
  if (form.link_type === "category" && !form.link_category_id.trim()) {
    errors.link_category_id = "Select a category."
  }
  if (form.link_type === "path" && !isPath(form.link_path.trim())) {
    errors.link_path = "Enter a path that starts with /."
  }
  if (!fields) {
    return errors
  }
  return Object.fromEntries(
    Object.entries(errors).filter(([key]) => fields.includes(key as keyof CampaignForm))
  )
}

// The fields that have one value for each language. `link_category_id` also ends in "_id", but it
// is not a language field.
const LANGUAGE_FIELDS = ["eyebrow", "title", "text", "button_label"]

/** Returns the language tabs that have a field with an error, in the order en, id. */
export function tabsWithErrors(errors: CampaignFormErrors): ("en" | "id")[] {
  const keys = Object.keys(errors).filter((key) => errors[key as keyof CampaignForm])
  return (["en", "id"] as const).filter((tab) =>
    keys.some((key) => LANGUAGE_FIELDS.some((field) => key === `${field}_${tab}`))
  )
}

/**
 * Returns the body of a create or an update. It sends no status and no dates, because the strict
 * schema of the route rejects them. The server clears the link field that the type does not use.
 */
export function toCampaignPayload(form: CampaignForm): Record<string, string | null> {
  const payload: Record<string, string | null> = {}
  for (const [key, value] of Object.entries(form) as [keyof CampaignForm, string][]) {
    const text = value.trim()
    payload[key] = OPTIONAL_FIELDS.includes(key) && text === "" ? null : text
  }
  return payload
}
