import type { ReceiptMimeType } from "./constants"

const MAX_NAME_LENGTH = 120
const BASE64 = /^[A-Za-z0-9+/]+={0,2}$/
// eslint-disable-next-line no-control-regex
const CONTROL_CHARACTERS = /[\u0000-\u001f\u007f]/g

const startsWith = (bytes: Buffer, prefix: number[], offset = 0): boolean =>
  bytes.length >= offset + prefix.length &&
  prefix.every((value, index) => bytes[offset + index] === value)

const ascii = (text: string): number[] => [...Buffer.from(text, "ascii")]

// Returns the type from the magic numbers. The file name and the claimed type are not trusted.
export function detectReceiptType(bytes: Buffer): ReceiptMimeType | null {
  if (startsWith(bytes, [0xff, 0xd8, 0xff])) {
    return "image/jpeg"
  }
  if (startsWith(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])) {
    return "image/png"
  }
  if (startsWith(bytes, ascii("RIFF")) && startsWith(bytes, ascii("WEBP"), 8)) {
    return "image/webp"
  }
  return null
}

// Returns the bytes of strict base64 text. Buffer.from alone skips characters that are not
// base64, so the text is checked first.
export function decodeReceipt(content: string): Buffer | null {
  if (!content || content.length % 4 !== 0 || !BASE64.test(content)) {
    return null
  }
  return Buffer.from(content, "base64")
}

// Returns the last part of the name with no path and no control characters. HTML characters stay,
// so each caller escapes the name when it shows it.
export function cleanFileName(name: string): string {
  const base = name.split(/[/\\]/).pop() ?? ""
  const clean = base.replace(CONTROL_CHARACTERS, "").trim().slice(0, MAX_NAME_LENGTH)
  return /^\.*$/.test(clean) ? "receipt" : clean
}
