import { readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

function readPublic(name: string): Buffer {
  return readFileSync(fileURLToPath(new URL(`../../public/${name}`, import.meta.url)))
}

// Reads the size from the first SOF marker (baseline or progressive) of a JPEG file.
function jpegSize(data: Buffer): { width: number; height: number } {
  expect(data.readUInt16BE(0)).toBe(0xffd8)
  let offset = 2
  while (offset < data.length) {
    const marker = data[offset + 1]!
    const length = data.readUInt16BE(offset + 2)
    if (marker >= 0xc0 && marker <= 0xc2) {
      return { height: data.readUInt16BE(offset + 5), width: data.readUInt16BE(offset + 7) }
    }
    offset += 2 + length
  }
  throw new Error("The JPEG file has no SOF marker.")
}

// Reads the size from the IHDR chunk of a PNG file.
function pngSize(data: Buffer): { width: number; height: number } {
  expect(data.subarray(1, 4).toString("ascii")).toBe("PNG")
  return { width: data.readUInt32BE(16), height: data.readUInt32BE(20) }
}

describe("share images", () => {
  it("has a 1200×630 default share image under 300 KB", () => {
    const data = readPublic("og-default.jpg")
    expect(jpegSize(data)).toEqual({ width: 1200, height: 630 })
    expect(data.length).toBeLessThan(300 * 1024)
  })

  it("has a square logo of at least 112 px", () => {
    const logo = pngSize(readPublic("logo.png"))
    expect(logo.width).toBe(logo.height)
    expect(logo.width).toBeGreaterThanOrEqual(112)
  })
})
