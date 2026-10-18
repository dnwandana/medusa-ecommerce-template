import { describe, expect, it } from "vitest"
import {
  MAX_RECEIPT_BYTES,
  MAX_RECEIPTS,
  RECEIPT_ACCEPT,
  checkReceiptFile,
  formatFileSize,
} from "~/utils/receiptFile"

describe("checkReceiptFile", () => {
  it.each([
    [{ type: "image/jpeg", size: 1000 }, null],
    [{ type: "image/png", size: 5 * 1024 * 1024 }, null],
    [{ type: "image/webp", size: 5 * 1024 * 1024 + 1 }, "size"],
    [{ type: "application/pdf", size: 10 }, "type"],
    [{ type: "", size: 10 }, "type"],
  ])("checks %j", (file, error) => {
    expect(checkReceiptFile(file)).toBe(error)
  })

  it("checks the type before the size", () => {
    expect(checkReceiptFile({ type: "application/pdf", size: MAX_RECEIPT_BYTES + 1 })).toBe("type")
  })

  it("has the limits of the backend", () => {
    expect(MAX_RECEIPTS).toBe(3)
    expect(MAX_RECEIPT_BYTES).toBe(5 * 1024 * 1024)
    expect(RECEIPT_ACCEPT).toBe("image/jpeg,image/png,image/webp")
  })
})

describe("formatFileSize", () => {
  it("formats the size", () => {
    expect(formatFileSize(839_680, "en")).toBe("820 KB")
    expect(formatFileSize(1_258_291, "en")).toBe("1.2 MB")
    expect(formatFileSize(1_258_291, "id")).toBe("1,2 MB")
  })
})
