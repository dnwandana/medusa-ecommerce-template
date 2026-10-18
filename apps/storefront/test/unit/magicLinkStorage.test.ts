// @vitest-environment happy-dom
// The unit project runs in Node, which has no localStorage. happy-dom gives one.
import { afterEach, describe, expect, it, vi } from "vitest"
import {
  clearMagicLink,
  MAGIC_LINK_STORAGE_KEY,
  readMagicLink,
  saveMagicLink,
} from "../../app/utils/magicLinkStorage"

const record = {
  request_id: "mlr_1",
  secret: "sec",
  email: "sari@example.com",
  redirect: "/checkout",
  sent_at: 1_760_000_000_000,
}

afterEach(() => {
  vi.unstubAllGlobals()
  localStorage.clear()
})

describe("magicLinkStorage", () => {
  it("saves, reads and clears the record", () => {
    expect(saveMagicLink(record)).toBe(true)
    expect(JSON.parse(localStorage.getItem(MAGIC_LINK_STORAGE_KEY)!)).toEqual(record)
    expect(readMagicLink()).toEqual(record)
    clearMagicLink()
    expect(readMagicLink()).toBeNull()
  })

  it("keeps a null redirect", () => {
    saveMagicLink({ ...record, redirect: null })
    expect(readMagicLink()?.redirect).toBeNull()
  })

  it.each([
    ["not JSON", "{"],
    ["no secret", JSON.stringify({ ...record, secret: undefined })],
    ["a wrong type", JSON.stringify({ ...record, sent_at: "now" })],
    ["a JSON value that is not an object", "null"],
  ])("returns null for %s", (_name, value) => {
    localStorage.setItem(MAGIC_LINK_STORAGE_KEY, value)
    expect(readMagicLink()).toBeNull()
  })

  // happy-dom binds the Storage methods on the instance, so a spy on Storage.prototype has no
  // effect. A stub of the global object throws the same way as a blocked localStorage.
  it("gives false and null when localStorage throws", () => {
    const blocked = () => {
      throw new Error("blocked")
    }
    vi.stubGlobal("localStorage", { setItem: blocked, getItem: blocked, removeItem: blocked })
    expect(saveMagicLink(record)).toBe(false)
    expect(readMagicLink()).toBeNull()
    expect(() => clearMagicLink()).not.toThrow()
  })

  it("gives false and null when the browser blocks access to localStorage", () => {
    const original = Object.getOwnPropertyDescriptor(globalThis, "localStorage")!
    Object.defineProperty(globalThis, "localStorage", {
      configurable: true,
      get() {
        throw new DOMException("Access is denied", "SecurityError")
      },
    })
    try {
      expect(saveMagicLink(record)).toBe(false)
      expect(readMagicLink()).toBeNull()
      expect(() => clearMagicLink()).not.toThrow()
    } finally {
      Object.defineProperty(globalThis, "localStorage", original)
    }
  })
})
