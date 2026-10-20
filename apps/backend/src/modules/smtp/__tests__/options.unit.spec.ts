import { SMTP_TIMEOUT_MS, transportOptions, validateSmtpOptions } from "../options"

const mailpit = { host: "localhost", port: 1025, secure: false, from: "orders@everyday.test" }
const resend = {
  host: "smtp.resend.com",
  port: 587,
  secure: false,
  user: "resend",
  password: "re_secret",
  from: "orders@shop.example.com",
}

describe("validateSmtpOptions", () => {
  it("accepts Mailpit with no user and no password", () => {
    expect(() => validateSmtpOptions(mailpit)).not.toThrow()
  })

  it("throws when the host is empty", () => {
    expect(() => validateSmtpOptions({ ...mailpit, host: "" })).toThrow(
      "The host option of smtp is required."
    )
  })

  it("throws when the sender address is empty", () => {
    expect(() => validateSmtpOptions({ ...mailpit, from: "" })).toThrow(
      "The from option of smtp is required."
    )
  })

  it.each([0, Number.NaN, 70000, 25.5])("throws for the port %p", (port) => {
    expect(() => validateSmtpOptions({ ...mailpit, port })).toThrow(
      "The port option of smtp must be an integer from 1 to 65535."
    )
  })

  it("throws for port 465 with secure false", () => {
    expect(() => validateSmtpOptions({ ...resend, port: 465, secure: false })).toThrow(
      "Port 465 uses implicit TLS. Set SMTP_SECURE=true."
    )
  })

  it("throws when only one of user and password has a value", () => {
    const message = "Set both SMTP_USER and SMTP_PASSWORD, or neither."
    expect(() => validateSmtpOptions({ ...resend, password: undefined })).toThrow(message)
    expect(() => validateSmtpOptions({ ...resend, user: undefined })).toThrow(message)
  })

  it("never puts the password in an error message", () => {
    try {
      validateSmtpOptions({ ...resend, port: 465, secure: false })
    } catch (error) {
      expect(String(error)).not.toContain("re_secret")
    }
  })
})

describe("transportOptions", () => {
  it("sends with no TLS and no auth to Mailpit", () => {
    expect(transportOptions(mailpit)).toEqual({
      host: "localhost",
      port: 1025,
      secure: false,
      connectionTimeout: SMTP_TIMEOUT_MS,
      greetingTimeout: SMTP_TIMEOUT_MS,
      socketTimeout: SMTP_TIMEOUT_MS,
    })
  })

  it("requires STARTTLS when a user name is set and secure is false", () => {
    expect(transportOptions(resend)).toMatchObject({
      secure: false,
      requireTLS: true,
      auth: { user: "resend", pass: "re_secret" },
    })
  })

  it("uses implicit TLS and no requireTLS for port 465", () => {
    const options = transportOptions({ ...resend, port: 465, secure: true })
    expect(options).toMatchObject({ port: 465, secure: true })
    expect(options).not.toHaveProperty("requireTLS")
  })

  it("sends no auth when the user name has only spaces", () => {
    const options = transportOptions({ ...mailpit, user: "  ", password: undefined })
    expect(options).not.toHaveProperty("auth")
    expect(options).not.toHaveProperty("requireTLS")
  })
})
