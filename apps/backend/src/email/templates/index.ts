import { RenderedEmail } from "./html"
import { renderLowStockOwner } from "./low-stock-owner"
import { renderMagicLink } from "./magic-link"
import { renderMorePaymentNeeded } from "./more-payment-needed"
import { renderNewOrderOwner } from "./new-order-owner"
import { renderOrderCancelled } from "./order-cancelled"
import { renderOrderDelivered } from "./order-delivered"
import { renderOrderPlaced } from "./order-placed"
import { renderOrderShipped } from "./order-shipped"
import { renderPaidCartAlert } from "./paid-cart-alert"
import { renderPasswordReset } from "./password-reset"
import { renderPaymentConfirmed } from "./payment-confirmed"
import { renderReceiptUploaded } from "./receipt-uploaded"
import { renderRefundSent } from "./refund-sent"
import { renderReviewRequest } from "./review-request"
import { renderWelcome } from "./welcome"
import { renderWishlistAlert } from "./wishlist-alert"

const templates: Record<string, (data: any) => RenderedEmail> = {
  "low-stock-owner": renderLowStockOwner,
  "magic-link": renderMagicLink,
  "more-payment-needed": renderMorePaymentNeeded,
  "new-order-owner": renderNewOrderOwner,
  "order-cancelled": renderOrderCancelled,
  "order-delivered": renderOrderDelivered,
  "order-placed": renderOrderPlaced,
  "order-shipped": renderOrderShipped,
  "paid-cart-alert": renderPaidCartAlert,
  "password-reset": renderPasswordReset,
  "payment-confirmed": renderPaymentConfirmed,
  "receipt-uploaded": renderReceiptUploaded,
  "refund-sent": renderRefundSent,
  "review-request": renderReviewRequest,
  welcome: renderWelcome,
  "wishlist-alert": renderWishlistAlert,
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
