// The plain text part helps the spam score, and some email clients show only the text part.

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  nbsp: " ",
}

// Decodes the entities in one pass, so "&amp;lt;" becomes "&lt;" and not "<".
function decodeEntities(text: string): string {
  return text.replace(/&(#\d{1,7}|#x[0-9a-f]{1,6}|[a-z]+);/gi, (entity, body: string) => {
    if (body.startsWith("#")) {
      const code =
        body[1] === "x" || body[1] === "X" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1))
      // A code point out of range makes String.fromCodePoint throw, so the entity stays.
      return code <= 0x10ffff ? String.fromCodePoint(code) : entity
    }
    return NAMED_ENTITIES[body.toLowerCase()] ?? entity
  })
}

// Removes the tags and decodes the entities of a short HTML fragment.
function fragmentText(html: string): string {
  return decodeEntities(html.replace(/<[^>]*>/g, ""))
    .replace(/\s+/g, " ")
    .trim()
}

// Returns the plain text part of an email from its HTML.
export function htmlToText(html: string): string {
  const text = html
    // 1. Remove the parts that a reader never sees.
    .replace(/<!--[\s\S]*?-->/g, "")
    .replace(/<head\b[^>]*>[\s\S]*?<\/head>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    // The preheader of renderShell is a hidden element.
    .replace(/<(\w+)\b[^>]*\bstyle="[^"]*display:\s*none[^"]*"[^>]*>[\s\S]*?<\/\1>/gi, "")
    // The line breaks in the HTML source are only white space. Steps 2 and 3 add the real ones.
    .replace(/\s+/g, " ")
    // 2. Write a link as "label: URL", or as "URL" when the label is the URL. The URL keeps its
    // entities here, so that step 4 decodes it only once.
    .replace(
      /<a\b[^>]*?\bhref\s*=\s*"([^"]*)"[^>]*>([\s\S]*?)<\/a>/gi,
      (_link, href: string, label: string) => {
        const url = decodeEntities(href).trim()
        const labelText = fragmentText(label)
        if (!url) {
          return label
        }
        return !labelText || labelText === url ? href : `${label}: ${href}`
      }
    )
    // 3. Give the block elements their line breaks.
    .replace(/<br\b[^>]*>/gi, "\n")
    .replace(/<\/(?:p|h[1-6]|table|ul)>/gi, "\n\n")
    .replace(/<\/(?:tr|div|li)>/gi, "\n")
    .replace(/<li\b[^>]*>/gi, "- ")
    .replace(/<\/td>/gi, " ")
    // 4. Remove all other tags.
    .replace(/<[^>]*>/g, "")

  // 5. Clean the white space.
  return decodeEntities(text)
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}
