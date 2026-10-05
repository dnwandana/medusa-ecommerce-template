export type ModuleEntry = { resolve: string; options?: Record<string, unknown> }
export type Env = Record<string, string | undefined>

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
    throw new Error(
      `SHIPPING_RATE_PER_KG must be a positive whole number. Value: ${value}`
    )
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
// provider for each channel. Brevo gets the channel when BREVO_API_KEY has a
// value. Otherwise the local provider writes each email to the log.
function notificationModule(env: Env): ModuleEntry {
  const apiKey = env.BREVO_API_KEY
  if (!apiKey) {
    return {
      resolve: "@medusajs/medusa/notification",
      options: {
        providers: [
          {
            resolve: "@medusajs/medusa/notification-local",
            id: "local",
            options: { name: LOCAL_NOTIFICATION_NAME, channels: ["feed", "email"] },
          },
        ],
      },
    }
  }

  if (!env.BREVO_SENDER_EMAIL) {
    throw new Error("BREVO_SENDER_EMAIL is required when BREVO_API_KEY has a value.")
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
          resolve: "./src/modules/brevo",
          id: "brevo",
          options: {
            channels: ["email"],
            apiKey,
            senderEmail: env.BREVO_SENDER_EMAIL,
            senderName: env.BREVO_SENDER_NAME || undefined,
          },
        },
      ],
    },
  }
}

const MAYAR_SANDBOX_URL = "https://api.mayar.io/hl/v2"
const DEFAULT_STOREFRONT_URL = "http://localhost:3000"

// Registers the mayar provider. Medusa stores its id as "pp_mayar_mayar". The provider is always
// registered, so the backend starts with an empty MAYAR_API_KEY. Each call to Mayar then fails.
function paymentModule(env: Env): ModuleEntry {
  return {
    resolve: "@medusajs/medusa/payment",
    options: {
      providers: [
        {
          resolve: "./src/modules/mayar",
          id: "mayar",
          options: {
            apiUrl: env.MAYAR_API_URL || MAYAR_SANDBOX_URL,
            apiKey: env.MAYAR_API_KEY || "",
            storefrontUrl: env.STOREFRONT_URL || DEFAULT_STOREFRONT_URL,
          },
        },
      ],
    },
  }
}

// Returns the custom modules that have their own data models.
function customModules(): ModuleEntry[] {
  return [
    { resolve: "./src/modules/product-review" },
    { resolve: "./src/modules/wishlist" },
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
  "S3_ENDPOINT",
] as const

// Returns the File Module with the S3 provider for Garage. It returns an empty list when
// S3_BUCKET has no value, so that Medusa keeps its local file storage.
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
              endpoint: env.S3_ENDPOINT,
              // Garage has no ACL support, so the provider must not send the x-amz-acl header.
              acl: false,
              additional_client_config: {
                forcePathStyle: true,
                // These two options are the workaround for Garage issue 1236.
                requestChecksumCalculation: "WHEN_REQUIRED",
                responseChecksumValidation: "WHEN_REQUIRED",
              },
            },
          },
        ],
      },
    },
  ]
}

// Returns the module list for medusa-config.ts. It reads only the given env object.
export function buildModules(env: Env): ModuleEntry[] {
  return [
    ...redisModules(env),
    fulfillmentModule(env),
    notificationModule(env),
    paymentModule(env),
    translationModule(),
    ...customModules(),
    ...fileModule(env),
  ]
}
