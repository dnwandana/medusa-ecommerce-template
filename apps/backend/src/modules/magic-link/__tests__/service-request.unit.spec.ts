import MagicLinkModuleService from "../service"
import { hashToken } from "../tokens"

const proto = MagicLinkModuleService.prototype as any
const now = new Date("2026-10-18T07:32:00.000Z")
const input = { email: "  Sari@Example.com ", locale: "id-ID", browser: "Chrome on Windows" }

const makeSelf = (rows: any[]) => ({
  listMagicLinkRequests: jest.fn(async (filters: any) =>
    filters.consumed_at === null ? rows.filter((r) => !r.consumed_at && !r.invalidated_at) : rows
  ),
  updateMagicLinkRequests: jest.fn(async (data: any) => data),
  createMagicLinkRequests: jest.fn(async (data: any) => ({
    id: "mlr_new",
    created_at: now,
    ...data,
  })),
})

describe("magic link service: createRequest", () => {
  it("creates a request with hashes and returns the plain token and secret", async () => {
    const self = makeSelf([])
    const result = await proto.createRequest.call(self, input, now)
    const stored = self.createMagicLinkRequests.mock.calls[0][0]
    expect(stored.email).toBe("sari@example.com")
    expect(stored.locale).toBe("id-ID")
    expect(stored.browser).toBe("Chrome on Windows")
    expect(stored.token_hash).toBe(hashToken(result.token))
    expect(stored.secret_hash).toBe(hashToken(result.secret))
    expect(stored).not.toHaveProperty("token")
    expect(stored.expires_at).toEqual(new Date("2026-10-18T07:47:00.000Z"))
    expect(result).toEqual({
      request_id: "mlr_new",
      token: expect.any(String),
      secret: expect.any(String),
      expires_at: new Date("2026-10-18T07:47:00.000Z"),
      created_at: now,
    })
    expect(result.token).not.toBe(result.secret)
  })

  it("sends no second link within 60 seconds", async () => {
    const self = makeSelf([
      {
        id: "mlr_1",
        created_at: new Date(now.getTime() - 59_000),
        consumed_at: null,
        invalidated_at: null,
      },
    ])
    expect(await proto.createRequest.call(self, input, now)).toBeNull()
    expect(self.createMagicLinkRequests).not.toHaveBeenCalled()
  })

  it("does not change the older links before the email is sent", async () => {
    const self = makeSelf([
      {
        id: "mlr_1",
        created_at: new Date(now.getTime() - 61_000),
        consumed_at: null,
        invalidated_at: null,
      },
    ])
    expect(await proto.createRequest.call(self, input, now)).not.toBeNull()
    expect(self.updateMagicLinkRequests).not.toHaveBeenCalled()
  })
})

describe("magic link service: invalidateOlderLinks", () => {
  it("makes the open links of the email that are older than the new link invalid", async () => {
    const self = makeSelf([{ id: "mlr_1" }])
    const newest = { request_id: "mlr_new", created_at: now }
    await proto.invalidateOlderLinks.call(self, "  Sari@Example.com ", newest, now)
    expect(self.listMagicLinkRequests).toHaveBeenCalledWith({
      email: "sari@example.com",
      consumed_at: null,
      invalidated_at: null,
      created_at: { $lt: now },
    })
    expect(self.updateMagicLinkRequests).toHaveBeenCalledWith([
      { id: "mlr_1", invalidated_at: now },
    ])
  })

  it("changes nothing when the email has no older open link", async () => {
    const self = makeSelf([])
    await proto.invalidateOlderLinks.call(
      self,
      "sari@example.com",
      { request_id: "mlr_new", created_at: now },
      now
    )
    expect(self.updateMagicLinkRequests).not.toHaveBeenCalled()
  })
})
