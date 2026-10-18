import type { CampaignForm, CampaignStatus } from "./campaign-form"

export type TitlePart = { text: string; italic: boolean }

export type HeroPreview = {
  eyebrow: string | null
  title: TitlePart[]
  text: string | null
  button: string
}

// A word between two asterisks. The first character after the opening asterisk is not a space,
// so "5* and 6*" stays as text.
const ITALIC_PATTERN = /\*([^*\s][^*]*?)\*/g

/** Splits a title into parts. A word between two `*` is italic. A single `*` stays as text. */
export function splitTitle(title: string): TitlePart[] {
  const parts: TitlePart[] = []
  let last = 0
  for (const match of title.matchAll(ITALIC_PATTERN)) {
    const start = match.index ?? 0
    if (start > last) {
      parts.push({ text: title.slice(last, start), italic: false })
    }
    parts.push({ text: match[1], italic: true })
    last = start + match[0].length
  }
  if (last < title.length) {
    parts.push({ text: title.slice(last), italic: false })
  }
  return parts
}

// Returns null for a blank text, because the hero leaves out a blank optional text.
const textOrNull = (value: string): string | null => value.trim() || null

/**
 * Returns the hero texts of one language. The storefront shows each language with no fallback to
 * the other language, so the preview does the same.
 */
export function heroPreview(form: CampaignForm, locale: "en" | "id"): HeroPreview {
  return {
    eyebrow: textOrNull(form[`eyebrow_${locale}`]),
    title: splitTitle(form[`title_${locale}`].trim()),
    text: textOrNull(form[`text_${locale}`]),
    button: form[`button_label_${locale}`].trim(),
  }
}

/** Returns the text that tells staff where the button of the hero goes. */
export function linkSummary(form: CampaignForm, categoryName: string | null): string {
  if (form.link_type === "category") {
    return `Category: ${categoryName ?? "The category no longer exists."}`
  }
  if (form.link_type === "path") {
    return `Store path: ${form.link_path}`
  }
  return "All products (/products)"
}

/** Returns the text of the status section. It names the live campaign that a publish ends. */
export function statusText(status: CampaignStatus, liveName: string | null): string | null {
  if (status === "live") {
    return "This home campaign is on the home page. Unpublish ends it. The home page then shows the text-only hero."
  }
  const publish = "Publish makes this home campaign live."
  return liveName
    ? `${publish} The live home campaign “${liveName}” then changes to Ended.`
    : publish
}
