import { RenderedEmail } from "./html"
import { button, heading, paragraph, renderShell, type EmailStore } from "./shell"

export type PasswordResetData = { store: EmailStore; reset_url: string }

// Returns the email that lets an admin user set a new password.
export function renderPasswordReset(data: PasswordResetData): RenderedEmail {
  if (!data?.reset_url) {
    throw new Error('The "password-reset" template needs a reset_url.')
  }

  const subject = "Reset your password"
  const intro =
    "We received a request to reset the password of your admin account. The link expires in 15 minutes."
  const body = [
    heading("Reset your password."),
    paragraph(intro),
    button(data.reset_url, "Set a new password"),
    paragraph("If you did not make this request, ignore this email.", true),
  ].join("\n")

  return {
    subject,
    html: renderShell({
      locale: "en-US",
      store: data.store,
      title: subject,
      preheader: intro,
      body,
      audience: "owner",
    }),
  }
}
