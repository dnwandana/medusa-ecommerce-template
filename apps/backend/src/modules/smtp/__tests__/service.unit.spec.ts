const mockSendMail = jest.fn()
jest.mock("nodemailer", () => ({ createTransport: jest.fn(() => ({ sendMail: mockSendMail })) }))

import { createTransport } from "nodemailer"
import SmtpNotificationProviderService from "../service"

const logger = { info: jest.fn(), warn: jest.fn(), error: jest.fn() } as any
const options = {
  host: "smtp.resend.com",
  port: 587,
  secure: false,
  user: "resend",
  password: "re_secret",
  from: "orders@shop.example.com",
  fromName: "Everyday" as string | undefined,
}
const store = { name: "Everyday", contact_email: null as unknown, whatsapp: null }
const notification = {
  to: "buyer@example.com",
  channel: "email",
  template: "password-reset",
  data: { store, reset_url: "https://shop.example.com/reset?token=t" },
}
const make = (o = options) => new SmtpNotificationProviderService({ logger }, o)

const withContact = (contactEmail: unknown) => ({
  ...notification,
  data: { ...notification.data, store: { ...store, contact_email: contactEmail } },
})

const smtpError = (message: string, fields: Record<string, unknown>) =>
  Object.assign(new Error(message), fields)

describe("SmtpNotificationProviderService", () => {
  beforeEach(() => {
    mockSendMail.mockReset()
    logger.error.mockReset()
    ;(createTransport as jest.Mock).mockClear()
    mockSendMail.mockResolvedValue({ messageId: "<m1@shop>" })
  })

  it("has the identifier smtp", () => {
    expect(SmtpNotificationProviderService.identifier).toBe("smtp")
  })

  it("creates one transport from the options", () => {
    make()
    expect(createTransport).toHaveBeenCalledTimes(1)
    expect(createTransport).toHaveBeenCalledWith(
      expect.objectContaining({ host: "smtp.resend.com", port: 587, requireTLS: true })
    )
  })

  it("sends the rendered email with a text part", async () => {
    await expect(make().send(notification as any)).resolves.toEqual({ id: "<m1@shop>" })

    expect(mockSendMail).toHaveBeenCalledTimes(1)
    const mail = mockSendMail.mock.calls[0][0]
    expect(mail.to).toBe("buyer@example.com")
    expect(mail.from).toEqual({ name: "Everyday", address: "orders@shop.example.com" })
    expect(typeof mail.subject).toBe("string")
    expect(mail.subject.length).toBeGreaterThan(0)
    expect(mail.html.startsWith("<!doctype html>")).toBe(true)
    expect(mail.text).toContain("https://shop.example.com/reset?token=t")
  })

  it("uses the sender address alone when no sender name is set", async () => {
    await make({ ...options, fromName: undefined }).send(notification as any)
    expect(mockSendMail.mock.calls[0][0].from).toBe("orders@shop.example.com")
  })

  it("sets Reply-To to the trimmed store contact email", async () => {
    await make().send(withContact("  help@shop.example.com ") as any)
    expect(mockSendMail.mock.calls[0][0].replyTo).toBe("help@shop.example.com")
  })

  it("sets no Reply-To for an empty, blank, or non-string contact email", async () => {
    for (const contactEmail of [null, "   ", 42]) {
      mockSendMail.mockClear()
      await make().send(withContact(contactEmail) as any)
      expect(mockSendMail.mock.calls[0][0]).not.toHaveProperty("replyTo")
    }
  })

  it("does not send when the recipient is empty", async () => {
    await expect(make().send({ ...notification, to: "" } as any)).rejects.toThrow(
      'The "password-reset" email has no recipient.'
    )
    expect(mockSendMail).not.toHaveBeenCalled()
  })

  it("does not send an unknown template", async () => {
    await expect(make().send({ ...notification, template: "nope" } as any)).rejects.toThrow(
      "Unknown email template: nope"
    )
    expect(mockSendMail).not.toHaveBeenCalled()
  })

  it("throws and logs an SMTP error with no address and no secret", async () => {
    mockSendMail.mockRejectedValue(
      smtpError("550 5.1.1 <buyer@example.com>: user unknown, auth resend:re_secret", {
        code: "EENVELOPE",
        responseCode: 550,
      })
    )
    const expected =
      'SMTP did not send the "password-reset" email. Code: EENVELOPE. Response code: 550.'

    await expect(make().send(notification as any)).rejects.toThrow(new Error(expected))

    expect(logger.error).toHaveBeenCalledTimes(1)
    expect(logger.error).toHaveBeenCalledWith(expected)
    for (const secret of ["buyer@example.com", "resend", "re_secret"]) {
      expect(expected).not.toContain(secret)
      expect(logger.error.mock.calls[0][0]).not.toContain(secret)
    }
  })

  it("throws on a timeout", async () => {
    mockSendMail.mockRejectedValue(smtpError("Greeting never received", { code: "ETIMEDOUT" }))
    await expect(make().send(notification as any)).rejects.toThrow(
      new Error('SMTP did not send the "password-reset" email. Code: ETIMEDOUT.')
    )
  })

  it("names an unknown cause when the error has no code", async () => {
    mockSendMail.mockRejectedValue(new Error("x"))
    await expect(make().send(notification as any)).rejects.toThrow(
      new Error('SMTP did not send the "password-reset" email. Code: unknown.')
    )
  })

  it("validateOptions rejects bad options", () => {
    expect(() =>
      SmtpNotificationProviderService.validateOptions({ ...options, port: 465 })
    ).toThrow("Port 465 uses implicit TLS. Set SMTP_SECURE=true.")
  })
})
