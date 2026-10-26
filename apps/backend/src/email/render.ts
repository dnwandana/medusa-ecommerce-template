import { renderTemplate } from "./templates"
import { htmlToText } from "./text"

export type EmailMessage = { subject: string; html: string; text: string; replyTo?: string }

// Returns the full message for a template, so that each email provider only sends. It throws for
// an unknown template, as renderTemplate does.
export function renderEmail(template: string, data: unknown): EmailMessage {
  const { subject, html } = renderTemplate(template, data)
  const text = htmlToText(html)

  // A reply goes to the store contact. Without a contact email, the reply goes to the sender.
  const contactEmail = (data as { store?: { contact_email?: unknown } } | null)?.store
    ?.contact_email
  const replyTo =
    typeof contactEmail === "string" && contactEmail.trim() ? contactEmail.trim() : undefined

  return { subject, html, text, ...(replyTo && { replyTo }) }
}
