import { cleanFileName, decodeReceipt, detectReceiptType } from "../file-rules"

describe("detectReceiptType", () => {
  it.each([
    ["jpeg", [0xff, 0xd8, 0xff, 0xe0], "image/jpeg"],
    ["png", [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], "image/png"],
    ["webp", [...Buffer.from("RIFF"), 0, 0, 0, 0, ...Buffer.from("WEBP")], "image/webp"],
  ])("finds %s from the first bytes", (_n, bytes, type) => {
    expect(detectReceiptType(Buffer.from(bytes as number[]))).toBe(type)
  })
  it("refuses a PDF and an HTML file", () => {
    expect(detectReceiptType(Buffer.from("%PDF-1.7"))).toBeNull()
    expect(detectReceiptType(Buffer.from("<html><body>"))).toBeNull()
    expect(detectReceiptType(Buffer.alloc(0))).toBeNull()
  })
})

describe("decodeReceipt", () => {
  it("decodes strict base64", () => {
    expect(decodeReceipt(Buffer.from("abc").toString("base64"))?.toString()).toBe("abc")
  })
  it("refuses text that is not base64 and an empty text", () => {
    expect(decodeReceipt("not base64!")).toBeNull()
    expect(decodeReceipt("")).toBeNull()
  })
})

describe("cleanFileName", () => {
  it.each([
    ["../../etc/a.png", "a.png"],
    ["C:\\Users\\sari\\bukti.jpg", "bukti.jpg"],
    ["  struk\u0000\n.webp ", "struk.webp"],
    ["", "receipt"],
    ["../", "receipt"],
  ])("cleans %j to %j", (input, output) => expect(cleanFileName(input)).toBe(output))
  it("keeps at most 120 characters", () => {
    expect(cleanFileName(`${"a".repeat(200)}.png`)).toHaveLength(120)
  })
  it("keeps HTML characters as text for the caller to escape", () => {
    expect(cleanFileName("<img src=x onerror=alert(1)>.png")).toBe(
      "<img src=x onerror=alert(1)>.png"
    )
  })
})
