import {
  MAGIC_LINK_CONFIRM_WINDOW_MS,
  MAGIC_LINK_LIFETIME_MS,
  MAGIC_LINK_RESEND_MS,
  createRandomToken,
  hashToken,
  tokenMatches,
} from "../tokens"

describe("magic link tokens", () => {
  it("has the times of the spec", () => {
    expect(MAGIC_LINK_LIFETIME_MS).toBe(900_000)
    expect(MAGIC_LINK_RESEND_MS).toBe(60_000)
    expect(MAGIC_LINK_CONFIRM_WINDOW_MS).toBe(300_000)
  })

  it("makes a new URL-safe token each time", () => {
    const a = createRandomToken()
    const b = createRandomToken()
    expect(a).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(a).not.toBe(b)
  })

  it("hashes with SHA-256", () => {
    expect(hashToken("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
    )
  })

  it("matches only the value of the hash", () => {
    const hash = hashToken("token-1")
    expect(tokenMatches("token-1", hash)).toBe(true)
    expect(tokenMatches("token-2", hash)).toBe(false)
    expect(tokenMatches("", hash)).toBe(false)
    expect(tokenMatches("token-1", "short")).toBe(false)
    expect(tokenMatches(undefined as any, hash)).toBe(false)
  })
})
