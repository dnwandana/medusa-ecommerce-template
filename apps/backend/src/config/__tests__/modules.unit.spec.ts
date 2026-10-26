import { buildModules, type Env } from "../modules"
import { s3ClientOptions } from "../s3"

const resolves = (env: Record<string, string | undefined>) =>
  buildModules(env).map((m) => m.resolve)

describe("buildModules: Redis modules", () => {
  it("adds no Redis module when REDIS_URL is absent", () => {
    const list = resolves({})
    expect(list).not.toContain("@medusajs/medusa/event-bus-redis")
    expect(list).not.toContain("@medusajs/medusa/workflow-engine-redis")
    expect(list).not.toContain("@medusajs/medusa/caching")
    expect(list).not.toContain("@medusajs/medusa/locking")
  })

  it("adds no Redis module when REDIS_URL is an empty string", () => {
    expect(resolves({ REDIS_URL: "" })).not.toContain("@medusajs/medusa/event-bus-redis")
  })

  it("adds the four Redis modules when REDIS_URL has a value", () => {
    const modules = buildModules({ REDIS_URL: "redis://localhost:6379" })
    const byResolve = Object.fromEntries(modules.map((m) => [m.resolve, m]))

    expect(byResolve["@medusajs/medusa/event-bus-redis"].options).toEqual({
      redisUrl: "redis://localhost:6379",
    })
    expect(byResolve["@medusajs/medusa/workflow-engine-redis"].options).toEqual({
      redis: { redisUrl: "redis://localhost:6379" },
    })
    expect(byResolve["@medusajs/medusa/caching"].options).toEqual({
      providers: [
        {
          resolve: "@medusajs/caching-redis",
          id: "caching-redis",
          is_default: true,
          options: { redisUrl: "redis://localhost:6379" },
        },
      ],
    })
    expect(byResolve["@medusajs/medusa/locking"].options).toEqual({
      providers: [
        {
          resolve: "@medusajs/medusa/locking-redis",
          id: "locking-redis",
          is_default: true,
          options: { redisUrl: "redis://localhost:6379" },
        },
      ],
    })
  })
})

describe("buildModules: fulfillment module", () => {
  const fulfillment = (env: Record<string, string | undefined>) =>
    buildModules(env).find((m) => m.resolve === "@medusajs/medusa/fulfillment")

  it("registers weight-shipping with the default rate of 10000", () => {
    expect(fulfillment({})?.options).toEqual({
      providers: [
        {
          resolve: "./src/modules/weight-shipping",
          id: "weight-shipping",
          options: { ratePerKg: 10000 },
        },
      ],
    })
  })

  it("reads the rate from SHIPPING_RATE_PER_KG", () => {
    const options = fulfillment({ SHIPPING_RATE_PER_KG: "12500" })?.options as any
    expect(options.providers[0].options).toEqual({ ratePerKg: 12500 })
  })

  it("uses the default rate for an empty value", () => {
    const options = fulfillment({ SHIPPING_RATE_PER_KG: "" })?.options as any
    expect(options.providers[0].options).toEqual({ ratePerKg: 10000 })
  })

  it("stops the start for a rate that is not a positive whole number", () => {
    for (const value of ["abc", "0", "-5", "10.5"]) {
      expect(() => buildModules({ SHIPPING_RATE_PER_KG: value })).toThrow(
        `SHIPPING_RATE_PER_KG must be a positive whole number. Value: ${value}`
      )
    }
  })
})

describe("buildModules: notification module", () => {
  const providers = (env: Record<string, string | undefined>) => {
    const entry = buildModules(env).find((m) => m.resolve === "@medusajs/medusa/notification")
    return (entry?.options as any)?.providers
  }

  const noSmtpProviders = [
    {
      resolve: "@medusajs/medusa/notification-local",
      id: "local",
      options: { name: "Local Notification Provider", channels: ["feed"] },
    },
    {
      resolve: "./src/modules/email-log",
      id: "email-log",
      options: { channels: ["email"] },
    },
  ]

  it("uses the local provider for feed and email-log for email when SMTP_HOST is absent", () => {
    expect(providers({})).toEqual(noSmtpProviders)
  })

  it("uses the local provider for feed and email-log for email when SMTP_HOST is empty", () => {
    expect(providers({ SMTP_HOST: "" })).toEqual(noSmtpProviders)
  })

  it("uses smtp for email when SMTP_HOST has a value", () => {
    expect(
      providers({
        SMTP_HOST: "smtp.example.com",
        SMTP_PORT: "587",
        SMTP_SECURE: "false",
        SMTP_USER: "smtp-user",
        SMTP_PASSWORD: "smtp-secret",
        EMAIL_FROM: "orders@shop.example.com",
        EMAIL_FROM_NAME: "Everyday",
      })
    ).toEqual([
      {
        resolve: "@medusajs/medusa/notification-local",
        id: "local",
        options: { name: "Local Notification Provider", channels: ["feed"] },
      },
      {
        resolve: "./src/modules/smtp",
        id: "smtp",
        options: {
          channels: ["email"],
          host: "smtp.example.com",
          port: 587,
          secure: false,
          user: "smtp-user",
          password: "smtp-secret",
          from: "orders@shop.example.com",
          fromName: "Everyday",
        },
      },
    ])
  })

  it("reads SMTP_SECURE=true and leaves the empty optional keys undefined", () => {
    const smtp = providers({
      SMTP_HOST: "localhost",
      SMTP_PORT: "1025",
      SMTP_SECURE: "true",
      SMTP_USER: "",
      SMTP_PASSWORD: "",
      EMAIL_FROM: "orders@everyday.test",
      EMAIL_FROM_NAME: "",
    })[1].options
    expect(smtp).toMatchObject({ port: 1025, secure: true })
    expect(smtp.user).toBeUndefined()
    expect(smtp.password).toBeUndefined()
    expect(smtp.fromName).toBeUndefined()
  })

  it("stops the start when SMTP_HOST has a value and EMAIL_FROM is absent", () => {
    expect(() => buildModules({ SMTP_HOST: "localhost", SMTP_PORT: "1025" })).toThrow(
      "EMAIL_FROM is required when SMTP_HOST has a value."
    )
  })
})

describe("buildModules: payment module", () => {
  const providers = (env: Record<string, string | undefined>) => {
    const entry = buildModules(env).find((m) => m.resolve === "@medusajs/medusa/payment")
    return (entry?.options as any)?.providers
  }

  it("registers the bank transfer provider first, with no options", () => {
    expect(providers({})[0]).toEqual({
      resolve: "./src/modules/bank-transfer",
      id: "bank-transfer",
    })
  })

  it("registers the bank transfer provider with the switch on", () => {
    expect(providers({})).toEqual([{ resolve: "./src/modules/bank-transfer", id: "bank-transfer" }])
  })

  it("stops the start when bank transfer is off and no gateway exists", () => {
    expect(() => buildModules({ BANK_TRANSFER_ENABLED: "false" })).toThrow(
      /BANK_TRANSFER_ENABLED=true/
    )
  })

  it("stops the start for a bad deadline", () => {
    expect(() => buildModules({ BANK_TRANSFER_DEADLINE_HOURS: "abc" })).toThrow(
      /BANK_TRANSFER_DEADLINE_HOURS/
    )
  })
})

describe("buildModules: product-review module", () => {
  it("adds the module with an empty environment", () => {
    expect(buildModules({})).toContainEqual({ resolve: "./src/modules/product-review" })
  })

  it("adds the module one time", () => {
    const list = buildModules({ REDIS_URL: "redis://localhost:6379" })
    expect(list.filter((m) => m.resolve === "./src/modules/product-review")).toHaveLength(1)
  })
})

describe("buildModules: wishlist module", () => {
  it("adds the module with an empty environment", () => {
    expect(buildModules({})).toContainEqual({ resolve: "./src/modules/wishlist" })
  })

  it("adds the module one time", () => {
    const list = buildModules({ REDIS_URL: "redis://localhost:6379" })
    expect(list.filter((m) => m.resolve === "./src/modules/wishlist")).toHaveLength(1)
  })

  it("keeps the product-review module", () => {
    expect(buildModules({})).toContainEqual({ resolve: "./src/modules/product-review" })
  })
})

describe("buildModules: bank account module", () => {
  it("registers the bank account module", () => {
    expect(buildModules({})).toContainEqual({ resolve: "./src/modules/bank-account" })
  })

  it("adds the module one time", () => {
    const list = buildModules({ REDIS_URL: "redis://localhost:6379" })
    expect(list.filter((m) => m.resolve === "./src/modules/bank-account")).toHaveLength(1)
  })
})

describe("buildModules: storefront module", () => {
  it("registers the storefront module", () => {
    expect(buildModules({})).toContainEqual({ resolve: "./src/modules/storefront" })
  })

  it("adds the module one time", () => {
    const list = buildModules({ REDIS_URL: "redis://localhost:6379" })
    expect(list.filter((m) => m.resolve === "./src/modules/storefront")).toHaveLength(1)
  })
})

describe("buildModules: translation module", () => {
  it("adds the Translation Module with and without Redis", () => {
    expect(resolves({})).toContain("@medusajs/medusa/translation")
    expect(resolves({ REDIS_URL: "redis://localhost:6379" })).toContain(
      "@medusajs/medusa/translation"
    )
  })
})

describe("buildModules: S3 file provider", () => {
  const FILE = "@medusajs/medusa/file"

  const s3Env = {
    S3_FILE_URL: "https://assets.example.com",
    S3_ACCESS_KEY_ID: "GK3515373e4c851ebaad366558",
    S3_SECRET_ACCESS_KEY: "secret-value",
    S3_REGION: "garage",
    S3_BUCKET: "store-assets",
    S3_ENDPOINT: "http://garage:3900",
    S3_RECEIPTS_BUCKET: "store-receipts",
  }

  const fileModule = (env: Record<string, string | undefined>) =>
    buildModules(env).find((m) => m.resolve === FILE)

  const s3ProviderOptions = (env: Record<string, string | undefined>) =>
    (fileModule(env)?.options as any).providers[0].options

  it("adds no file module when S3_BUCKET is absent", () => {
    expect(fileModule({})).toBeUndefined()
  })

  // Review Focus: an empty S3_BUCKET keeps local file storage.
  it("adds no file module when S3_BUCKET is an empty string", () => {
    expect(fileModule({ ...s3Env, S3_BUCKET: "" })).toBeUndefined()
  })

  it("adds the S3 provider when S3_BUCKET has a value", () => {
    expect(fileModule(s3Env)).toEqual({
      resolve: FILE,
      options: {
        providers: [
          {
            resolve: "@medusajs/medusa/file-s3",
            id: "s3",
            options: {
              file_url: "https://assets.example.com",
              access_key_id: "GK3515373e4c851ebaad366558",
              secret_access_key: "secret-value",
              region: "garage",
              bucket: "store-assets",
              endpoint: "http://garage:3900",
              acl: false,
              additional_client_config: {
                forcePathStyle: true,
                requestChecksumCalculation: "WHEN_REQUIRED",
                responseChecksumValidation: "WHEN_REQUIRED",
              },
            },
          },
        ],
      },
    })
  })

  it("starts with no S3_ENDPOINT and gives the provider no endpoint", () => {
    const { S3_ENDPOINT: _endpoint, ...env } = s3Env
    expect(s3ProviderOptions(env).endpoint).toBeUndefined()
  })

  it("passes S3_FORCE_PATH_STYLE=false to the client config", () => {
    const options = s3ProviderOptions({ ...s3Env, S3_FORCE_PATH_STYLE: "false" })
    expect(options.additional_client_config.forcePathStyle).toBe(false)
  })

  it("removes one slash from the end of S3_FILE_URL", () => {
    const entry = fileModule({ ...s3Env, S3_FILE_URL: "https://assets.example.com/" }) as any
    expect(entry.options.providers[0].options.file_url).toBe("https://assets.example.com")
  })

  // Review Focus: a bucket with an absent credential must stop the start.
  it("stops with the names of the absent keys", () => {
    expect(() =>
      buildModules({ ...s3Env, S3_ACCESS_KEY_ID: undefined, S3_SECRET_ACCESS_KEY: "" })
    ).toThrow(
      "The S3 file provider needs more configuration. Set these keys: S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY."
    )
  })

  it("does not put a secret in the error message", () => {
    expect.assertions(1)
    try {
      buildModules({ ...s3Env, S3_REGION: undefined })
    } catch (error) {
      expect((error as Error).message).not.toContain("secret-value")
    }
  })
})

describe("buildModules: magic link module", () => {
  it("registers the magic link module one time", () => {
    const list = buildModules({ REDIS_URL: "redis://localhost:6379" })
    expect(list.filter((m) => m.resolve === "./src/modules/magic-link")).toHaveLength(1)
    expect(list).toContainEqual({ resolve: "./src/modules/magic-link" })
  })
})

describe("buildModules: payment receipt module", () => {
  const s3Env = {
    S3_FILE_URL: "https://assets.example.com",
    S3_ACCESS_KEY_ID: "GK3515373e4c851ebaad366558",
    S3_SECRET_ACCESS_KEY: "secret-value",
    S3_REGION: "garage",
    S3_BUCKET: "store-assets",
    S3_ENDPOINT: "http://garage:3900",
  }

  const receipt = (env: Env) =>
    buildModules(env).find((m) => m.resolve === "./src/modules/payment-receipt")

  it("keeps the receipts in a local directory with no S3 bucket", () => {
    expect(receipt({})?.options).toEqual({ storage: { type: "local", dir: "uploads/receipts" } })
    expect(receipt({ RECEIPTS_DIR: "" })?.options).toEqual({
      storage: { type: "local", dir: "uploads/receipts" },
    })
    expect(receipt({ RECEIPTS_DIR: "/srv/receipts" })?.options).toEqual({
      storage: { type: "local", dir: "/srv/receipts" },
    })
  })

  it("keeps the receipts in the private bucket with S3", () => {
    const env = { ...s3Env, S3_RECEIPTS_BUCKET: "store-receipts" }
    expect(receipt(env)?.options).toEqual({
      storage: {
        type: "s3",
        bucket: "store-receipts",
        endpoint: s3Env.S3_ENDPOINT,
        region: s3Env.S3_REGION,
        accessKeyId: s3Env.S3_ACCESS_KEY_ID,
        secretAccessKey: s3Env.S3_SECRET_ACCESS_KEY,
        clientOptions: s3ClientOptions(env),
      },
    })
  })

  it("gives the receipt storage no endpoint and the path style of S3_FORCE_PATH_STYLE", () => {
    const { S3_ENDPOINT: _endpoint, ...env } = s3Env
    const storage = (
      receipt({ ...env, S3_RECEIPTS_BUCKET: "store-receipts", S3_FORCE_PATH_STYLE: "false" })
        ?.options as any
    ).storage
    expect(storage.endpoint).toBeUndefined()
    expect(storage.clientOptions.forcePathStyle).toBe(false)
  })

  it("stops when S3 is on and the receipts bucket is missing", () => {
    expect(() => buildModules(s3Env)).toThrow(
      "S3_RECEIPTS_BUCKET is missing. Set it when S3_BUCKET has a value."
    )
  })

  it("refuses the public assets bucket for receipts", () => {
    expect(() => buildModules({ ...s3Env, S3_RECEIPTS_BUCKET: s3Env.S3_BUCKET })).toThrow(
      "S3_RECEIPTS_BUCKET must not be the S3_BUCKET of the product images."
    )
  })

  it("registers the module one time", () => {
    const list = buildModules({ REDIS_URL: "redis://localhost:6379" })
    expect(list.filter((m) => m.resolve === "./src/modules/payment-receipt")).toHaveLength(1)
  })
})

describe("buildModules: production services", () => {
  const prodS3Env = {
    S3_FILE_URL: "https://assets.example.com",
    S3_ACCESS_KEY_ID: "GK3515373e4c851ebaad366558",
    S3_SECRET_ACCESS_KEY: "secret-value",
    S3_REGION: "auto",
    S3_BUCKET: "store-assets",
    S3_ENDPOINT: "https://s3.example.com",
    S3_RECEIPTS_BUCKET: "store-receipts",
  }
  const prod = { NODE_ENV: "production", REDIS_URL: "redis://redis:6379", ...prodS3Env }

  it("stops a production start with no Redis and no S3 store", () => {
    expect(() => buildModules({ NODE_ENV: "production" })).toThrow(
      "Production needs Redis and an S3 store. Set these keys: REDIS_URL, S3_BUCKET."
    )
  })

  it("stops a production start with no REDIS_URL", () => {
    expect(() => buildModules({ ...prod, REDIS_URL: undefined })).toThrow(
      "Production needs Redis and an S3 store. Set these keys: REDIS_URL."
    )
  })

  // Review Focus: compose passes an empty S3_BUCKET as an empty string.
  it("treats an empty S3_BUCKET as missing in production", () => {
    expect(() => buildModules({ ...prod, S3_BUCKET: "" })).toThrow(
      "Production needs Redis and an S3 store. Set these keys: S3_BUCKET."
    )
  })

  // Review Focus: a REDIS_URL can hold a password.
  it("does not put the REDIS_URL value in the error message", () => {
    expect.assertions(1)
    try {
      buildModules({ ...prod, REDIS_URL: "redis://:hunter2@redis:6379", S3_BUCKET: "" })
    } catch (error) {
      expect((error as Error).message).not.toContain("hunter2")
    }
  })

  it("builds the Redis and S3 modules in production with all keys", () => {
    const list = resolves(prod)
    expect(list).toContain("@medusajs/medusa/event-bus-redis")
    expect(list).toContain("@medusajs/medusa/file")
  })

  // Review Focus: the existing receipt rule still applies in production.
  it("keeps the receipt bucket error in production", () => {
    expect(() => buildModules({ ...prod, S3_RECEIPTS_BUCKET: "" })).toThrow(
      "S3_RECEIPTS_BUCKET is missing. Set it when S3_BUCKET has a value."
    )
  })

  // Review Focus: development, the tests, and medusa build keep local storage and no Redis.
  it.each([undefined, "development", "test"])(
    "allows no Redis and no S3 store when NODE_ENV is %s",
    (nodeEnv) => {
      expect(() => buildModules({ NODE_ENV: nodeEnv })).not.toThrow()
    }
  )
})

describe("buildModules: split worker mode", () => {
  // Review Focus: a staging server can split the processes with a NODE_ENV that is not production.
  it.each(["server", "worker"])("stops a %s start with no REDIS_URL outside production", (mode) => {
    expect(() =>
      buildModules({ NODE_ENV: "staging", MEDUSA_WORKER_MODE: mode, REDIS_URL: "" })
    ).toThrow(
      `MEDUSA_WORKER_MODE=${mode} needs Redis. Set REDIS_URL, or set MEDUSA_WORKER_MODE=shared.`
    )
  })

  it.each([undefined, "", "shared"])("allows no Redis when MEDUSA_WORKER_MODE is %s", (mode) => {
    expect(() => buildModules({ MEDUSA_WORKER_MODE: mode })).not.toThrow()
  })

  it("allows a split start with REDIS_URL", () => {
    const list = resolves({ MEDUSA_WORKER_MODE: "worker", REDIS_URL: "redis://localhost:6379" })
    expect(list).toContain("@medusajs/medusa/event-bus-redis")
  })
})
