export type TitlePart = { text: string; italic: boolean }

// One pair of asterisks with at least one character between them.
const ITALIC_PART = /\*([^*]+)\*/g

// Splits a campaign title into plain and italic parts. Staff write "The *linen* edit" to set
// "linen" in italics. An asterisk with no pair stays as text. The parts are text, never markup.
export function campaignTitleParts(title: string): TitlePart[] {
  const parts: TitlePart[] = []
  let start = 0
  for (const match of title.matchAll(ITALIC_PART)) {
    parts.push({ text: title.slice(start, match.index), italic: false })
    parts.push({ text: match[1]!, italic: true })
    start = match.index + match[0].length
  }
  parts.push({ text: title.slice(start), italic: false })
  return parts.filter((part) => part.text !== "")
}
