export const PAYMENT_RECEIPT_MODULE = "paymentReceipt"

export const MAX_RECEIPTS = 3
export const MAX_RECEIPT_BYTES = 5 * 1024 * 1024
export const MAX_NOTE_LENGTH = 500

export const RECEIPT_MIME_TYPES = ["image/jpeg", "image/png", "image/webp"] as const
export type ReceiptMimeType = (typeof RECEIPT_MIME_TYPES)[number]

export const RECEIPT_EXTENSIONS: Record<ReceiptMimeType, "jpg" | "png" | "webp"> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
}

export const PAYMENT_RECEIPT_UPLOADED = "payment_receipt.uploaded"
export const PAYMENT_MORE_REQUESTED = "payment_receipt.more_requested"

export const TYPE_MESSAGE = "This file type is not supported. Choose a JPG, PNG or WebP file."
export const SIZE_MESSAGE = "The file is larger than 5 MB. Choose a smaller file."
