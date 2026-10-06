import { buildModules } from "../modules"

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

  it("uses the local provider for feed and email when BREVO_API_KEY is absent", () => {
    expect(providers({})).toEqual([
      {
        resolve: "@medusajs/medusa/notification-local",
        id: "local",
        options: { name: "Local Notification Provider", channels: ["feed", "email"] },
      },
    ])
  })

  it("uses the local provider for email when BREVO_API_KEY is empty", () => {
    expect(providers({ BREVO_API_KEY: "" })).toHaveLength(1)
  })

  it("uses Brevo for email when BREVO_API_KEY has a value", () => {
    expect(
      providers({
        BREVO_API_KEY: "xkeysib-test",
        BREVO_SENDER_EMAIL: "store@example.com",
        BREVO_SENDER_NAME: "My Store",
      })
    ).toEqual([
      {
        resolve: "@medusajs/medusa/notification-local",
        id: "local",
        options: { name: "Local Notification Provider", channels: ["feed"] },
      },
      {
        resolve: "./src/modules/brevo",
        id: "brevo",
        options: {
          channels: ["email"],
          apiKey: "xkeysib-test",
          senderEmail: "store@example.com",
          senderName: "My Store",
        },
      },
    ])
  })

  it("stops the start when the key has a value and the sender email is absent", () => {
    expect(() => buildModules({ BREVO_API_KEY: "xkeysib-test" })).toThrow(
      "BREVO_SENDER_EMAIL is required when BREVO_API_KEY has a value."
    )
  })
})

describe("buildModules: payment module", () => {
  const providers = (env: Record<string, string | undefined>) => {
    const entry = buildModules(env).find((m) => m.resolve === "@medusajs/medusa/payment")
    return (entry?.options as any)?.providers
  }

  it("registers the mayar provider with the sandbox URL and an empty key by default", () => {
    expect(providers({})).toEqual([
      {
        resolve: "./src/modules/mayar",
        id: "mayar",
        options: {
          apiUrl: "https://api.mayar.io/hl/v2",
          apiKey: "",
          storefrontUrl: "http://localhost:3000",
        },
      },
    ])
  })

  it("reads the Mayar values and the storefront URL from the environment", () => {
    expect(
      providers({
        MAYAR_API_URL: "https://api.mayar.id/hl/v2",
        MAYAR_API_KEY: "live-key",
        STOREFRONT_URL: "https://shop.example.com",
      })
    ).toEqual([
      {
        resolve: "./src/modules/mayar",
        id: "mayar",
        options: {
          apiUrl: "https://api.mayar.id/hl/v2",
          apiKey: "live-key",
          storefrontUrl: "https://shop.example.com",
        },
      },
    ])
  })

  it("uses the defaults for empty values", () => {
    expect(providers({ MAYAR_API_URL: "", STOREFRONT_URL: "" })[0].options).toEqual({
      apiUrl: "https://api.mayar.io/hl/v2",
      apiKey: "",
      storefrontUrl: "http://localhost:3000",
    })
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
  }

  const fileModule = (env: Record<string, string | undefined>) =>
    buildModules(env).find((m) => m.resolve === FILE)

  it("adds no file module when S3_BUCKET is absent", () => {
    expect(fileModule({})).toBeUndefined()
  })

  // Review Focus: an empty S3_BUCKET keeps local file storage.
  it("adds no file module when S3_BUCKET is an empty string", () => {
    expect(fileModule({ ...s3Env, S3_BUCKET: "" })).toBeUndefined()
  })

  it("adds the S3 provider with the Garage options when S3_BUCKET has a value", () => {
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
      buildModules({ ...s3Env, S3_ENDPOINT: undefined })
    } catch (error) {
      expect((error as Error).message).not.toContain("secret-value")
    }
  })
})
