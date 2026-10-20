import { en } from "./en"
import { id } from "./id"

export type EmailLocale = "en-US" | "id-ID"

export type EmailKey = keyof typeof en

// Returns the email locale for a stored locale. An unknown or absent value gives English, so an
// email is never a mix of two languages.
export function toEmailLocale(value: unknown): EmailLocale {
  return value === "id-ID" || value === "id" ? "id-ID" : "en-US"
}

// Returns the value for the `lang` attribute of the `<html>` element.
export function langOf(locale: EmailLocale): "en" | "id" {
  return locale === "id-ID" ? "id" : "en"
}

// Returns the text for the key with each `{name}` replaced by `values.name`. It does not escape
// the result, because the block helpers escape their text. An unknown key gives the English text,
// else the key itself, so a send never fails on a missing text.
export function t(
  locale: EmailLocale,
  key: EmailKey,
  values?: Record<string, string | number>
): string {
  const dictionary: Record<string, string> = locale === "id-ID" ? id : en
  const english: Record<string, string> = en
  const text = dictionary[key] ?? english[key] ?? key
  // One pass over the text, so a value that contains "{x}" is not replaced again. A name with no
  // value stays in the text, which makes the gap visible in a test.
  return text.replace(/\{(\w+)\}/g, (match, name: string) =>
    values && Object.prototype.hasOwnProperty.call(values, name) ? String(values[name]) : match
  )
}
