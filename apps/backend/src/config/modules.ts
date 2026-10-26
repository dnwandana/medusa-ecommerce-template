import type { ReceiptStorageOptions } from "../modules/payment-receipt/storage/types"
import { bankTransferDeadlineHours, checkPaymentProviders, registeredGateways } from "./payment"
import { s3ClientOptions } from "./s3"

// A provider entry, for example a payment gateway, also has an id.
export type ModuleEntry = { resolve: string; id?: string; options?: Record<string, unknown> }
export type Env = Record<string, string | undefined>

const PRODUCTION_REQUIRED_KEYS = ["REDIS_URL", "S3_BUCKET"] as const

// Stops a production start that has no Redis or no S3 store. Production runs the server and the
// worker as two processes. The in-memory event bus, locks, and sessions do not work across
// processes. Production must not store files on a container disk, because the disk is temporary.
// The message names the keys only, because a REDIS_URL can hold a password.
function checkProductionServices(env: Env): void {
  if (env.NODE_ENV !== "production") {
    return
  }

  const missing = PRODUCTION_REQUIRED_KEYS.filter((key) => !env[key])
  if (missing.length > 0) {
    throw new Error(
      `Production needs Redis and an S3 store. Set these keys: ${missing.join(", ")}.`
    )
  }
}

// Stops a split server or worker start that has no Redis, also outside production. The two
// processes then share no events and no locks, and the subscribers never run with no error.
function checkWorkerModeServices(env: Env): void {
  const mode = env.MEDUSA_WORKER_MODE || "shared"
  if (mode !== "shared" && !env.REDIS_URL) {
    throw new Error(
      `MEDUSA_WORKER_MODE=${mode} needs Redis. Set REDIS_URL, or set MEDUSA_WORKER_MODE=shared.`
    )
  }
}

// Returns the Redis modules. Returns an empty list when REDIS_URL has no value,
// so that the tests can run without Redis.
function redisModules(env: Env): ModuleEntry[] {
  const redisUrl = env.REDIS_URL
  if (!redisUrl) {
    return []
  }

  return [
    {
      resolve: "@medusajs/medusa/event-bus-redis",
      options: { redisUrl },
    },
    {
      resolve: "@medusajs/medusa/workflow-engine-redis",
      options: { redis: { redisUrl } },
    },
    {
      resolve: "@medusajs/medusa/caching",
      options: {
        providers: [
          {
            resolve: "@medusajs/caching-redis",
            id: "caching-redis",
            is_default: true,
            options: { redisUrl },
          },
        ],
      },
    },
    {
      resolve: "@medusajs/medusa/locking",
      options: {
        providers: [
          {
            resolve: "@medusajs/medusa/locking-redis",
            id: "locking-redis",
            is_default: true,
            options: { redisUrl },
          },
        ],
      },
    },
  ]
}

const DEFAULT_SHIPPING_RATE_PER_KG = 10000

// Returns the shipping rate in rupiah for each kilogram. A bad value stops the
// start, because a wrong rate gives wrong prices to all customers.
function shippingRatePerKg(env: Env): number {
  const value = env.SHIPPING_RATE_PER_KG
  if (value === undefined || value === "") {
    return DEFAULT_SHIPPING_RATE_PER_KG
  }
  if (!/^[1-9]\d*$/.test(value)) {
    throw new Error(`SHIPPING_RATE_PER_KG must be a positive whole number. Value: ${value}`)
  }
  return Number(value)
}

// Registers the weight-shipping provider. Medusa stores its id as
// "weight-shipping_weight-shipping".
function fulfillmentModule(env: Env): ModuleEntry {
  return {
    resolve: "@medusajs/medusa/fulfillment",
    options: {
      providers: [
        {
          resolve: "./src/modules/weight-shipping",
          id: "weight-shipping",
          options: { ratePerKg: shippingRatePerKg(env) },
        },
      ],
    },
  }
}

const LOCAL_NOTIFICATION_NAME = "Local Notification Provider"

// Puts one provider on the email channel, because Medusa permits only one
// provider for each channel. The smtp provider gets the channel when SMTP_HOST
// has a value. Otherwise the email-log provider renders each email and writes it
// to the log, so that a bad template fails as it fails with SMTP. The local
// provider keeps the feed channel in both cases.
function notificationModule(env: Env): ModuleEntry {
  const host = env.SMTP_HOST
  if (!host) {
    return {
      resolve: "@medusajs/medusa/notification",
      options: {
        providers: [
          {
            resolve: "@medusajs/medusa/notification-local",
            id: "local",
            options: { name: LOCAL_NOTIFICATION_NAME, channels: ["feed"] },
          },
          {
            resolve: "./src/modules/email-log",
            id: "email-log",
            options: { channels: ["email"] },
          },
        ],
      },
    }
  }

  if (!env.EMAIL_FROM) {
    throw new Error("EMAIL_FROM is required when SMTP_HOST has a value.")
  }

  return {
    resolve: "@medusajs/medusa/notification",
    options: {
      providers: [
        {
          resolve: "@medusajs/medusa/notification-local",
          id: "local",
          options: { name: LOCAL_NOTIFICATION_NAME, channels: ["feed"] },
        },
        {
          resolve: "./src/modules/smtp",
          id: "smtp",
          options: {
            channels: ["email"],
            host,
            // An empty or bad SMTP_PORT gives 0 or NaN. validateSmtpOptions then stops the start.
            port: Number(env.SMTP_PORT),
            secure: env.SMTP_SECURE === "true",
            user: env.SMTP_USER || undefined,
            password: env.SMTP_PASSWORD || undefined,
            from: env.EMAIL_FROM,
            fromName: env.EMAIL_FROM_NAME || undefined,
          },
        },
      ],
    },
  }
}

// Registers the payment providers. Bank transfer is the default provider, and Medusa stores its id
// as "pp_bank-transfer_bank-transfer". The provider stays registered when BANK_TRANSFER_ENABLED is
// false, so that the admin can still capture and cancel the old bank transfer orders. A client
// project adds its gateway to GATEWAY_PROVIDERS in payment.ts.
function paymentModule(env: Env): ModuleEntry {
  return {
    resolve: "@medusajs/medusa/payment",
    options: {
      providers: [
        { resolve: "./src/modules/bank-transfer", id: "bank-transfer" },
        ...registeredGateways(env).map((gateway) => gateway.entry(env)),
      ],
    },
  }
}

const DEFAULT_RECEIPTS_DIR = "uploads/receipts"

// Returns the storage of the payment receipts. The receipts are private, so they never go to
// S3_BUCKET, which has a public URL (S3_FILE_URL). Without S3 they go to a directory outside
// static/.
// Only development and the tests use this directory, because production requires S3_BUCKET.
// The messages name the keys only, because a value can be a secret.
function receiptStorage(env: Env): ReceiptStorageOptions {
  if (!env.S3_BUCKET) {
    return { type: "local", dir: env.RECEIPTS_DIR || DEFAULT_RECEIPTS_DIR }
  }

  const bucket = env.S3_RECEIPTS_BUCKET
  if (!bucket) {
    throw new Error("S3_RECEIPTS_BUCKET is missing. Set it when S3_BUCKET has a value.")
  }
  if (bucket === env.S3_BUCKET) {
    throw new Error("S3_RECEIPTS_BUCKET must not be the S3_BUCKET of the product images.")
  }

  // fileModule() stops the start when one of these keys is missing. S3_ENDPOINT is optional, as in
  // fileModule().
  return {
    type: "s3",
    bucket,
    endpoint: env.S3_ENDPOINT || undefined,
    region: env.S3_REGION!,
    accessKeyId: env.S3_ACCESS_KEY_ID!,
    secretAccessKey: env.S3_SECRET_ACCESS_KEY!,
    clientOptions: s3ClientOptions(env),
  }
}

// Returns the custom modules that have their own data models.
function customModules(env: Env): ModuleEntry[] {
  return [
    { resolve: "./src/modules/product-review" },
    { resolve: "./src/modules/wishlist" },
    { resolve: "./src/modules/bank-account" },
    { resolve: "./src/modules/storefront" },
    { resolve: "./src/modules/magic-link" },
    { resolve: "./src/modules/payment-receipt", options: { storage: receiptStorage(env) } },
  ]
}

// Returns the Translation Module. The Store API uses it to return product content in the locale
// of the request. It needs the feature flag "translation" in medusa-config.ts.
function translationModule(): ModuleEntry {
  return { resolve: "@medusajs/medusa/translation" }
}

const S3_REQUIRED_KEYS = [
  "S3_FILE_URL",
  "S3_ACCESS_KEY_ID",
  "S3_SECRET_ACCESS_KEY",
  "S3_REGION",
] as const

// Returns the File Module with the S3 provider. It returns an empty list when S3_BUCKET has no
// value, so that Medusa keeps its local file storage. This occurs only outside production,
// because checkProductionServices() stops a production start with no S3_BUCKET.
function fileModule(env: Env): ModuleEntry[] {
  const bucket = env.S3_BUCKET
  if (!bucket) {
    return []
  }

  // The message names the absent keys only. It must not show a value, because a value
  // can be a secret.
  const missing = S3_REQUIRED_KEYS.filter((key) => !env[key])
  if (missing.length > 0) {
    throw new Error(
      `The S3 file provider needs more configuration. Set these keys: ${missing.join(", ")}.`
    )
  }

  return [
    {
      resolve: "@medusajs/medusa/file",
      options: {
        providers: [
          {
            resolve: "@medusajs/medusa/file-s3",
            id: "s3",
            options: {
              // Medusa joins the URL and the file key with a slash.
              file_url: env.S3_FILE_URL!.replace(/\/$/, ""),
              access_key_id: env.S3_ACCESS_KEY_ID,
              secret_access_key: env.S3_SECRET_ACCESS_KEY,
              region: env.S3_REGION,
              bucket,
              // With no endpoint, the AWS SDK uses the AWS endpoint of S3_REGION.
              endpoint: env.S3_ENDPOINT || undefined,
              // Some S3 stores do not support ACLs, so the provider must not send the x-amz-acl
              // header.
              acl: false,
              additional_client_config: s3ClientOptions(env),
            },
          },
        ],
      },
    },
  ]
}

// Returns the module list for medusa-config.ts. It reads only the given env object.
export function buildModules(env: Env): ModuleEntry[] {
  checkProductionServices(env)
  checkWorkerModeServices(env)
  checkPaymentProviders(env)
  // The cancel job and the subscribers read the deadline later. A bad value must stop the start.
  bankTransferDeadlineHours(env)

  return [
    ...redisModules(env),
    fulfillmentModule(env),
    notificationModule(env),
    paymentModule(env),
    translationModule(),
    ...customModules(env),
    ...fileModule(env),
  ]
}
