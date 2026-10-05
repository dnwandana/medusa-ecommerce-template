import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import passwordResetHandler, { config } from "../password-reset"

const makeContainer = (admin: Record<string, unknown>) => {
  const createNotifications = jest.fn().mockResolvedValue({})
  const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() }
  const registry: Record<string, unknown> = {
    [ContainerRegistrationKeys.LOGGER]: logger,
    [ContainerRegistrationKeys.CONFIG_MODULE]: { admin },
    [Modules.NOTIFICATION]: { createNotifications },
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

  it("sends a customer to the storefront reset page", async () => {
    const { container, createNotifications } = makeContainer(admin)

    await run(container, { entity_id: "buyer@example.com", actor_type: "customer", token: "tok_1" })

    expect(createNotifications).toHaveBeenCalledWith({
      to: "buyer@example.com",
      channel: "email",
      template: "password-reset",
      data: {
        reset_url:
          "https://shop.example.com/account/reset-password?token=tok_1&email=buyer%40example.com",
      },
    })
  })

  it("sends an admin user to the admin reset page", async () => {
    const { container, createNotifications } = makeContainer(admin)

    await run(container, { entity_id: "owner@example.com", actor_type: "user", token: "tok_2" })

    expect(createNotifications.mock.calls[0][0].data.reset_url).toBe(
      "https://api.shop.example.com/app/reset-password?token=tok_2&email=owner%40example.com"
    )
  })

  // Review Focus: characters in the email and the token that need URL encoding.
  it("URL-encodes the email and the token", async () => {
    const { container, createNotifications } = makeContainer(admin)

    await run(container, { entity_id: "a+b@example.com", actor_type: "customer", token: "t/k=1" })

    expect(createNotifications.mock.calls[0][0].data.reset_url).toBe(
      "https://shop.example.com/account/reset-password?token=t%2Fk%3D1&email=a%2Bb%40example.com"
    )
  })

  it("removes a trailing slash from the storefront URL", async () => {
    const { container, createNotifications } = makeContainer({
      ...admin,
      storefrontUrl: "https://shop.example.com/",
    })
    await run(container, { entity_id: "buyer@example.com", actor_type: "customer", token: "tok_1" })
    expect(createNotifications.mock.calls[0][0].data.reset_url).toContain(
      "https://shop.example.com/account/reset-password?"
    )
  })

  it("logs an error and sends nothing when the storefront URL is absent", async () => {
    const { container, createNotifications, logger } = makeContainer({ ...admin, storefrontUrl: undefined })
    await run(container, { entity_id: "buyer@example.com", actor_type: "customer", token: "tok_1" })
    expect(createNotifications).not.toHaveBeenCalled()
    expect(logger.error).toHaveBeenCalledWith(
      "The password-reset email was not sent. STOREFRONT_URL has no value."
    )
  })

  it("logs the error and does not throw when the send fails", async () => {
    const { container, createNotifications, logger } = makeContainer(admin)
    createNotifications.mockRejectedValue(new Error("Brevo is down"))

    await expect(
      run(container, { entity_id: "buyer@example.com", actor_type: "customer", token: "tok_1" })
    ).resolves.toBeUndefined()
    expect(logger.error).toHaveBeenCalledWith(
      "The password-reset email failed. Cause: Brevo is down"
    )
  })
})
