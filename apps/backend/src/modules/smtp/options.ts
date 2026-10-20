import { MedusaError } from "@medusajs/framework/utils"
import type SMTPTransport from "nodemailer/lib/smtp-transport"

// A dead or slow SMTP server must not hold a subscriber or a job for minutes.
export const SMTP_TIMEOUT_MS = 10000

const IMPLICIT_TLS_PORT = 465

export type SmtpOptions = {
  host: string
  port: number
  secure: boolean
  user?: string
  password?: string
  from: string
  fromName?: string
}

function hasText(value: unknown): value is string {
  return typeof value === "string" && value.trim() !== ""
}

function invalid(message: string): MedusaError {
  return new MedusaError(MedusaError.Types.INVALID_DATA, message)
}

// Stops startup on a bad SMTP setting. The messages name the option, never its value, because
// the value can be a secret or an email address.
export function validateSmtpOptions(options: Record<string, unknown>): void {
  if (!hasText(options?.host)) {
    throw invalid("The host option of smtp is required.")
  }
  if (!hasText(options.from)) {
    throw invalid("The from option of smtp is required.")
  }

  // An empty or bad SMTP_PORT must not become port 0.
  const port = options.port
  if (typeof port !== "number" || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw invalid("The port option of smtp must be an integer from 1 to 65535.")
  }

  // Without secure, the client waits for a STARTTLS greeting that port 465 never sends.
  // The send then hangs until the timeout.
  if (port === IMPLICIT_TLS_PORT && options.secure !== true) {
    throw invalid("Port 465 uses implicit TLS. Set SMTP_SECURE=true.")
  }

  if (hasText(options.user) !== hasText(options.password)) {
    throw invalid("Set both SMTP_USER and SMTP_PASSWORD, or neither.")
  }
}

// Builds the Nodemailer transport options. It reads only its argument, so the tests need no env.
export function transportOptions(options: SmtpOptions): SMTPTransport.Options {
  const transport: SMTPTransport.Options = {
    host: options.host,
    port: options.port,
    secure: options.secure,
    connectionTimeout: SMTP_TIMEOUT_MS,
    greetingTimeout: SMTP_TIMEOUT_MS,
    socketTimeout: SMTP_TIMEOUT_MS,
  }

  // A server with no user name is a local inbox such as Mailpit, which has no TLS.
  // A user name of only spaces counts as no user name, as in validateSmtpOptions.
  if (options.user?.trim()) {
    transport.auth = { user: options.user, pass: options.password }
    // A real server must not get the password over a plain connection.
    if (!options.secure) {
      transport.requireTLS = true
    }
  }

  return transport
}
