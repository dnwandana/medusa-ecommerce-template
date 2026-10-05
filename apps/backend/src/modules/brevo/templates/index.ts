import { RenderedEmail } from "./html"
import { renderOrderPlaced } from "./order-placed"
import { renderPaidCartAlert } from "./paid-cart-alert"
import { renderPasswordReset } from "./password-reset"

const templates: Record<string, (data: any) => RenderedEmail> = {
  "order-placed": renderOrderPlaced,
  "paid-cart-alert": renderPaidCartAlert,
  "password-reset": renderPasswordReset,
}

// Returns the subject and the HTML body for a template name.
export function renderTemplate(template: string, data: unknown): RenderedEmail {
  // Only own keys count, so names such as "constructor" and "toString" are unknown.
  const render = Object.prototype.hasOwnProperty.call(templates, template)
    ? templates[template]
    : undefined
  if (!render) {
    throw new Error(`Unknown email template: ${template}`)
  }
  return render(data)
}
