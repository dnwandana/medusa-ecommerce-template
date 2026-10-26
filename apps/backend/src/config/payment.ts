import { BANK_TRANSFER_PROVIDER_ID } from "../modules/bank-transfer/constants"
import type { Env, ModuleEntry } from "./modules"

// A payment gateway that a client project adds. `entry` gives the provider of the Payment Module.
// It reads its options from the given env, because `medusa-config.ts` imports this file before
// `loadEnv` runs. `providerId` is the id that Medusa stores, "pp_<identifier>_<id>".
export type GatewayProvider = {
  entry(env: Env): ModuleEntry
  providerId: string
  isConfigured(env: Env): boolean
}

// A client project adds its gateway here. The gateway loads only when its own key has a value, as
// Redis, S3, and SMTP do. The template has no gateway.
export const GATEWAY_PROVIDERS: GatewayProvider[] = []

const DEFAULT_DEADLINE_HOURS = 24
const HOUR_MS = 60 * 60 * 1000

// Returns the bank transfer switch. A bad value stops the start, because a typing error must not
// turn off the only payment method with no error.
export function bankTransferEnabled(env: Env): boolean {
  const value = env.BANK_TRANSFER_ENABLED
  if (value === undefined || value === "" || value === "true") {
    return true
  }
  if (value === "false") {
    return false
  }
  throw new Error(`BANK_TRANSFER_ENABLED must be true or false. Value: ${value}`)
}

// Returns the hours that a customer has to transfer the money and upload the receipt. A bad value
// stops the start, because the cancel job would cancel orders at a wrong time.
export function bankTransferDeadlineHours(env: Env): number {
  const value = env.BANK_TRANSFER_DEADLINE_HOURS
  if (value === undefined || value === "") {
    return DEFAULT_DEADLINE_HOURS
  }
  if (!/^[1-9]\d*$/.test(value)) {
    throw new Error(
      `BANK_TRANSFER_DEADLINE_HOURS must be a positive whole number of hours. Value: ${value}`
    )
  }
  return Number(value)
}

export function bankTransferDeadlineMs(env: Env): number {
  return bankTransferDeadlineHours(env) * HOUR_MS
}

// Returns the gateways that have their configuration in the env.
export function registeredGateways(
  env: Env,
  gateways: GatewayProvider[] = GATEWAY_PROVIDERS
): GatewayProvider[] {
  return gateways.filter((gateway) => gateway.isConfigured(env))
}

// Returns the provider ids that a new customer can select. Bank transfer comes first, because it
// is the default payment method of the template.
export function regionPaymentProviderIds(
  env: Env,
  gateways: GatewayProvider[] = GATEWAY_PROVIDERS
): string[] {
  const ids = registeredGateways(env, gateways).map((gateway) => gateway.providerId)
  return bankTransferEnabled(env) ? [BANK_TRANSFER_PROVIDER_ID, ...ids] : ids
}

// Stops a start that gives the customers no payment method, because no order could then complete.
export function checkPaymentProviders(
  env: Env,
  gateways: GatewayProvider[] = GATEWAY_PROVIDERS
): void {
  if (regionPaymentProviderIds(env, gateways).length === 0) {
    throw new Error(
      "Bank transfer is off and no gateway provider is registered. Set BANK_TRANSFER_ENABLED=true, or add a gateway provider."
    )
  }
}
