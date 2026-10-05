import { escapeHtml, layout, RenderedEmail } from "./html"

export type PasswordResetData = { reset_url: string }

// Returns the email that lets a customer or an admin user set a new password.
export function renderPasswordReset(data: PasswordResetData): RenderedEmail {
  if (!data?.reset_url) {
    throw new Error('The "password-reset" template needs a reset_url.')
  }

  const body = [
    "<p>We received a request to reset your password.</p>",
    `<p><a href="${escapeHtml(data.reset_url)}">Set a new password</a></p>`,
    "<p>This link expires in 15 minutes.</p>",
    "<p>If you did not make this request, ignore this email.</p>",
  ].join("\n")

  return {
    subject: "Reset your password",
    html: layout("Reset your password", body),
  }
}
