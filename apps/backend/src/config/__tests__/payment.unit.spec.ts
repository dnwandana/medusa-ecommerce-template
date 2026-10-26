import {
  bankTransferDeadlineHours,
  bankTransferDeadlineMs,
  bankTransferEnabled,
  checkPaymentProviders,
  type GatewayProvider,
  regionPaymentProviderIds,
  registeredGateways,
} from "../payment"

const gateway: GatewayProvider = {
  entry: () => ({ resolve: "./src/modules/test-gateway", id: "test" }),
  providerId: "pp_test_test",
  isConfigured: (env) => !!env.TEST_GATEWAY_KEY,
}

describe("bankTransferEnabled", () => {
  it("is on for an absent or empty value and for true", () => {
    expect(bankTransferEnabled({})).toBe(true)
    expect(bankTransferEnabled({ BANK_TRANSFER_ENABLED: "" })).toBe(true)
    expect(bankTransferEnabled({ BANK_TRANSFER_ENABLED: "true" })).toBe(true)
  })

  it("is off for false", () => {
    expect(bankTransferEnabled({ BANK_TRANSFER_ENABLED: "false" })).toBe(false)
  })

  it.each(["TRUE", "False", "1", "yes", " true"])("stops the start for %p", (value) => {
    expect(() => bankTransferEnabled({ BANK_TRANSFER_ENABLED: value })).toThrow(
      /BANK_TRANSFER_ENABLED/
    )
  })
})

describe("bankTransferDeadlineHours", () => {
  it("is 24 for an absent or empty value", () => {
    expect(bankTransferDeadlineHours({})).toBe(24)
    expect(bankTransferDeadlineHours({ BANK_TRANSFER_DEADLINE_HOURS: "" })).toBe(24)
  })

  it("reads the hours, and bankTransferDeadlineMs gives milliseconds", () => {
    expect(bankTransferDeadlineHours({ BANK_TRANSFER_DEADLINE_HOURS: "48" })).toBe(48)
    expect(bankTransferDeadlineMs({ BANK_TRANSFER_DEADLINE_HOURS: "48" })).toBe(172_800_000)
    expect(bankTransferDeadlineMs({})).toBe(86_400_000)
  })

  it.each(["0", "-1", "1.5", "abc", " 24"])("stops the start for %p", (value) => {
    expect(() => bankTransferDeadlineHours({ BANK_TRANSFER_DEADLINE_HOURS: value })).toThrow(
      /BANK_TRANSFER_DEADLINE_HOURS/
    )
  })
})

describe("registeredGateways", () => {
  it("keeps only the gateways that have their configuration", () => {
    expect(registeredGateways({}, [gateway])).toEqual([])
    expect(registeredGateways({ TEST_GATEWAY_KEY: "k" }, [gateway])).toEqual([gateway])
  })

  it("gives no gateway in the template", () => {
    expect(registeredGateways({ TEST_GATEWAY_KEY: "k" })).toEqual([])
  })
})

describe("regionPaymentProviderIds", () => {
  it("gives bank transfer first, then the configured gateways", () => {
    expect(regionPaymentProviderIds({}, [])).toEqual(["pp_bank-transfer_bank-transfer"])
    expect(regionPaymentProviderIds({ TEST_GATEWAY_KEY: "k" }, [gateway])).toEqual([
      "pp_bank-transfer_bank-transfer",
      "pp_test_test",
    ])
  })

  it("leaves out bank transfer when the switch is off", () => {
    expect(
      regionPaymentProviderIds({ BANK_TRANSFER_ENABLED: "false", TEST_GATEWAY_KEY: "k" }, [gateway])
    ).toEqual(["pp_test_test"])
  })
})

describe("checkPaymentProviders", () => {
  it("stops the start when bank transfer is off and no gateway is configured", () => {
    expect(() => checkPaymentProviders({ BANK_TRANSFER_ENABLED: "false" }, [gateway])).toThrow(
      "Bank transfer is off and no gateway provider is registered. Set BANK_TRANSFER_ENABLED=true, or add a gateway provider."
    )
  })

  it("allows a start with bank transfer off and a configured gateway", () => {
    expect(() =>
      checkPaymentProviders({ BANK_TRANSFER_ENABLED: "false", TEST_GATEWAY_KEY: "k" }, [gateway])
    ).not.toThrow()
  })

  it("allows a start with bank transfer on and no gateway", () => {
    expect(() => checkPaymentProviders({})).not.toThrow()
  })
})
