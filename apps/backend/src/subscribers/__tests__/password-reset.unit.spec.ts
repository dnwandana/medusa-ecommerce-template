import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import { STOREFRONT_MODULE } from "../../modules/storefront"
import passwordResetHandler, { config } from "../password-reset"

const makeContainer = (admin: Record<string, unknown>) => {
  const createNotifications = jest.fn().mockResolvedValue({})
  const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() }
  const registry: Record<string, unknown> = {
    [ContainerRegistrationKeys.LOGGER]: logger,
    [ContainerRegistrationKeys.CONFIG_MODULE]: { admin },
    [Modules.NOTIFICATION]: { createNotifications },
    [STOREFRONT_MODULE]: {
      getContact: jest.fn().mockResolvedValue({
        email: "hello@everyday.id",
        phone: null,
        whatsapp: null,
        address: null,
        social_links: [],
      }),
    },
    [Modules.STORE]: { listStores: jest.fn().mockResolvedValue([{ name: "Everyday" }]) },
  }
  const container = { resolve: (key: string) => registry[key] } as any
  return { container, createNotifications, logger }
}

const admin = {
  storefrontUrl: "https://shop.example.com",
  backendUrl: "https://api.shop.example.com",
  path: "/app",
}

const run = (container: any, data: Record<string, unknown>) =>
  passwordResetHandler({
    event: { name: "auth.password_reset", data },
    container,
    pluginOptions: {},
  } as any)

describe("password-reset subscriber", () => {
  it("listens to the auth.password_reset event", () => {
    expect(config.event).toBe("auth.password_reset")
  })

  it("sends nothing for a customer", async () => {
    const { container, createNotifications, logger } = makeContainer(admin)
    await run(container, { entity_id: "buyer@example.com", actor_type: "customer", token: "tok_1" })
    expect(createNotifications).not.toHaveBeenCalled()
    expect(logger.error).not.toHaveBeenCalled()
  })

  it("sends an admin user to the admin reset page", async () => {
    const { container, createNotifications } = makeContainer(admin)

    await run(container, { entity_id: "owner@example.com", actor_type: "user", token: "tok_2" })

    expect(createNotifications.mock.calls[0][0].data.reset_url).toBe(
      "https://api.shop.example.com/app/reset-password?token=tok_2&email=owner%40example.com"
    )
  })

  it("uses the localhost default when backendUrl is the Medusa default", async () => {
    const { container, createNotifications } = makeContainer({ ...admin, backendUrl: "/" })
    await run(container, { entity_id: "owner@example.com", actor_type: "user", token: "t 1" })
    expect(createNotifications.mock.calls[0][0].data.reset_url).toBe(
      "http://localhost:9000/app/reset-password?token=t%201&email=owner%40example.com"
    )
  })

  it("uses /app when the admin path is absent", async () => {
    const { container, createNotifications } = makeContainer({
      backendUrl: "https://api.shop.example.com",
    })
    await run(container, { entity_id: "owner@example.com", actor_type: "user", token: "t" })
    expect(createNotifications.mock.calls[0][0].data.reset_url).toBe(
      "https://api.shop.example.com/app/reset-password?token=t&email=owner%40example.com"
    )
  })

  it("passes the store to the template", async () => {
    const { container, createNotifications } = makeContainer(admin)

    await run(container, { entity_id: "owner@example.com", actor_type: "user", token: "tok_2" })

    expect(createNotifications.mock.calls[0][0].data.store.name).toBe("Everyday")
  })

  // Review Focus: characters in the email and the token that need URL encoding.
  it("URL-encodes the email and the token", async () => {
    const { container, createNotifications } = makeContainer(admin)

    await run(container, { entity_id: "a+b@example.com", actor_type: "user", token: "t/k=1" })

    expect(createNotifications.mock.calls[0][0].data.reset_url).toBe(
      "https://api.shop.example.com/app/reset-password?token=t%2Fk%3D1&email=a%2Bb%40example.com"
    )
  })

  it("logs the error and does not throw when the send fails", async () => {
    const { container, createNotifications, logger } = makeContainer(admin)
    createNotifications.mockRejectedValue(new Error("SMTP is down"))

    await expect(
      run(container, { entity_id: "owner@example.com", actor_type: "user", token: "tok_1" })
    ).resolves.toBeUndefined()
    expect(logger.error).toHaveBeenCalledWith(
      "The password-reset email failed. Cause: SMTP is down"
    )
  })
})
