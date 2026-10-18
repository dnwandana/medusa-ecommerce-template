import { BANK_TRANSFER_PROVIDER_ID } from "./bankTransfer"

// Each string is a locale key.
export type PaymentRowKeys = {
  kind: "manual" | "gateway"
  title: string
  caption: string
  hint: string | null
}

// Returns the locale keys of one payment row. The storefront does not know the gateway of a
// client, so a gateway with no locale key gets the generic name and hint.
export function paymentRowKeys(
  providerId: string,
  hasKey: (key: string) => boolean
): PaymentRowKeys {
  const title = `checkout.paymentProviders.${providerId}`
  const hint = `checkout.paymentHints.${providerId}`

  if (providerId === BANK_TRANSFER_PROVIDER_ID) {
    return {
      kind: "manual",
      title,
      caption: "checkout.paymentCaptions.manual",
      hint: hasKey(hint) ? hint : null,
    }
  }

  return {
    kind: "gateway",
    title: hasKey(title) ? title : "checkout.paymentProviders.default",
    caption: "checkout.paymentCaptions.gateway",
    hint: hasKey(hint) ? hint : "checkout.gatewayHint",
  }
}
