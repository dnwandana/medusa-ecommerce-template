// The limits are the same as the backend limits in `apps/backend/src/modules/payment-receipt`.
export const MAX_RECEIPTS = 3
export const MAX_RECEIPT_BYTES = 5 * 1024 * 1024

// The value of the `accept` attribute of the file input.
export const RECEIPT_ACCEPT = "image/jpeg,image/png,image/webp"

const RECEIPT_TYPES = RECEIPT_ACCEPT.split(",")

export type ReceiptFileError = "type" | "size"

// Returns the first problem of the file, or null. The backend checks the file bytes again.
export function checkReceiptFile(file: { type: string; size: number }): ReceiptFileError | null {
  if (!RECEIPT_TYPES.includes(file.type)) return "type"
  if (file.size > MAX_RECEIPT_BYTES) return "size"
  return null
}

const KB = 1024
const MB = 1024 * 1024

// Returns "820 KB" below 1 MB, else "1.2 MB". The decimal sign follows the locale.
export function formatFileSize(bytes: number, locale: string): string {
  if (bytes < MB) {
    return `${new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(bytes / KB)} KB`
  }
  const format = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })
  return `${format.format(bytes / MB)} MB`
}
