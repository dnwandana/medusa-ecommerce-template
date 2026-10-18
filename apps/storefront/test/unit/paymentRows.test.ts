import { describe, expect, it } from "vitest"
import { BANK_TRANSFER_PROVIDER_ID } from "~/utils/bankTransfer"
import { paymentRowKeys } from "~/utils/paymentRows"

const keys = new Set([
  "checkout.paymentProviders.pp_bank-transfer_bank-transfer",
  "checkout.paymentHints.pp_bank-transfer_bank-transfer",
])
const hasKey = (key: string) => keys.has(key)

describe("paymentRowKeys", () => {
  it("gives the manual row the bank transfer keys", () => {
    expect(paymentRowKeys(BANK_TRANSFER_PROVIDER_ID, hasKey)).toEqual({
      kind: "manual",
      title: "checkout.paymentProviders.pp_bank-transfer_bank-transfer",
      caption: "checkout.paymentCaptions.manual",
      hint: "checkout.paymentHints.pp_bank-transfer_bank-transfer",
    })
  })

  it("gives the manual row no hint when the locale files have none", () => {
    expect(paymentRowKeys(BANK_TRANSFER_PROVIDER_ID, () => false).hint).toBeNull()
  })

  it("gives a gateway with no locale key the generic keys", () => {
    expect(paymentRowKeys("pp_gateway_card", hasKey)).toEqual({
      kind: "gateway",
      title: "checkout.paymentProviders.default",
      caption: "checkout.paymentCaptions.gateway",
      hint: "checkout.gatewayHint",
    })
  })

  it("uses the gateway name when the locale files have it", () => {
    expect(
      paymentRowKeys(
        "pp_gateway_card",
        (key) => key === "checkout.paymentProviders.pp_gateway_card"
      ).title
    ).toBe("checkout.paymentProviders.pp_gateway_card")
  })

  it("uses the gateway hint when the locale files have it", () => {
    expect(
      paymentRowKeys("pp_gateway_card", (key) => key === "checkout.paymentHints.pp_gateway_card")
        .hint
    ).toBe("checkout.paymentHints.pp_gateway_card")
  })
})
