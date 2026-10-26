import { renderEmail } from "../../../email/render"
import EmailLogNotificationProviderService from "../service"

const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() } as any
const magicLinkData = {
  locale: "en-US",
  store: { name: "Everyday", contact_email: null, whatsapp: null, phone: null },
  first_name: "Ayu",
  sign_in_url: "https://shop.example.com/verify?token=secret-token",
  browser: "Firefox on Linux",
  requested_at: "2026-10-26T03:00:00.000Z",
}
const notification = {
  to: "buyer@example.com",
  channel: "email",
  template: "magic-link",
  data: magicLinkData,
}
const make = () => new EmailLogNotificationProviderService({ logger }, { channels: ["email"] })
const loggedLines = () =>
  logger.info.mock.calls.map((call: unknown[]) => String(call[0])).join("\n")

describe("EmailLogNotificationProviderService", () => {
  const originalNodeEnv = process.env.NODE_ENV

  afterEach(() => {
    process.env.NODE_ENV = originalNodeEnv
    jest.clearAllMocks()
  })

  it("has the identifier email-log", () => {
    expect(EmailLogNotificationProviderService.identifier).toBe("email-log")
  })

  it("logs the template and the subject, and the text outside production", async () => {
    await expect(make().send(notification as any)).resolves.toEqual({ id: "email-log" })
    const lines = loggedLines()
    expect(lines).toContain('"magic-link"')
    expect(lines).toContain(renderEmail("magic-link", magicLinkData).subject)
    expect(lines).toContain("secret-token")
  })

  it("never logs the text or the recipient in production", async () => {
    process.env.NODE_ENV = "production"
    await make().send(notification as any)
    const lines = loggedLines()
    expect(lines).toContain('"magic-link"')
    expect(lines).not.toContain("secret-token")
    expect(lines).not.toContain("https://")
    expect(lines).not.toContain("buyer@example.com")
  })

  it("never logs the recipient outside production", async () => {
    await make().send(notification as any)
    expect(loggedLines()).not.toContain("buyer@example.com")
  })

  it("fails for a bad template", async () => {
    await expect(
      make().send({ ...notification, template: "no-such-template" } as any)
    ).rejects.toThrow("Unknown email template: no-such-template")
    expect(logger.info).not.toHaveBeenCalled()
  })

  it("fails for incomplete template data", async () => {
    await expect(
      make().send({ ...notification, data: { ...magicLinkData, sign_in_url: "" } } as any)
    ).rejects.toThrow('The "magic-link" template needs a sign_in_url.')
  })
})
