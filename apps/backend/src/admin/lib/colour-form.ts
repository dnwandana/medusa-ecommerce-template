import { isHexColour } from "../../modules/storefront/settings-rules"

export type ColourForm = { name: string; hex: string }

export type AdminColour = ColourForm & { id: string }

/** Returns an error text for each field that POST /admin/storefront/colours does not accept. */
export function validateColourForm(form: ColourForm): Partial<Record<keyof ColourForm, string>> {
  const errors: Partial<Record<keyof ColourForm, string>> = {}
  if (!form.name.trim()) {
    errors.name = "Enter a name."
  }
  if (!isHexColour(form.hex.trim())) {
    errors.hex = "Enter a hex in the format #rrggbb."
  }
  return errors
}

/** Returns the body of the colour routes. The storefront compares the hex in lower case. */
export function toColourPayload(form: ColourForm): ColourForm {
  return { name: form.name.trim(), hex: form.hex.trim().toLowerCase() }
}
