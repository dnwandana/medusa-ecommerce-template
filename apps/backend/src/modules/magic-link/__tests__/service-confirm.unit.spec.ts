import { MedusaError } from "@medusajs/framework/utils"
import MagicLinkModuleService from "../service"
import { hashToken } from "../tokens"

const proto = MagicLinkModuleService.prototype as any

const at = (time: string) => {
  const full = time.length === 5 ? `${time}:00` : time
  return new Date(`2026-10-18T${full}.000Z`)
}

const fixture = () => ({
  id: "mlr_1",
  email: "sari@example.com",
  token_hash: hashToken("tok"),
  secret_hash: hashToken("sec"),
  locale: "id-ID",
  browser: "Chrome on Windows",
  created_at: at("07:32"),
  expires_at: at("07:47"),
  confirmed_at: null,
  consumed_at: null,
  invalidated_at: null,
})

const makeSelf = (change: Record<string, unknown>) => {
  const request = { ...fixture(), ...change }
  return {
    retrieveMagicLinkRequest: jest.fn(async (id: string) => {
      if (id !== request.id) {
        throw new MedusaError(MedusaError.Types.NOT_FOUND, "MagicLinkRequest not found")
      }
      return request
    }),
    updateMagicLinkRequests: jest.fn(async (data: any) => data),
  }
}

describe("magic link service: verify, confirm, status and consume", () => {
  let self: ReturnType<typeof makeSelf>

  beforeEach(() => {
    self = makeSelf({})
  })

  it("verifies an open link and changes nothing", async () => {
    expect(await proto.verifyLink.call(self, "mlr_1", "tok", at("07:40"))).toEqual({
      browser: "Chrome on Windows",
      requested_at: at("07:32"),
      locale: "id-ID",
    })
    expect(self.updateMagicLinkRequests).not.toHaveBeenCalled()
  })

  it.each([
    ["a wrong token", {}, "bad", at("07:40")],
    ["an expired link", {}, "tok", at("07:47")],
    ["a confirmed link", { confirmed_at: at("07:35") }, "tok", at("07:40")],
    ["an invalidated link", { invalidated_at: at("07:35") }, "tok", at("07:40")],
    ["a used link", { consumed_at: at("07:35") }, "tok", at("07:40")],
  ])("does not verify %s", async (_name, change, token, time) => {
    const self = makeSelf(change)
    expect(await proto.verifyLink.call(self, "mlr_1", token, time)).toBeNull()
    expect(await proto.confirmLink.call(self, "mlr_1", token, time)).toBe(false)
  })

  it("returns null and false for an unknown id", async () => {
    expect(await proto.verifyLink.call(self, "mlr_unknown", "tok", at("07:40"))).toBeNull()
    expect(await proto.linkStatus.call(self, "mlr_unknown", "sec", at("07:40"))).toBe("invalid")
  })

  it("confirms an open link one time", async () => {
    expect(await proto.confirmLink.call(self, "mlr_1", "tok", at("07:40"))).toBe(true)
    expect(self.updateMagicLinkRequests).toHaveBeenCalledWith({
      id: "mlr_1",
      confirmed_at: at("07:40"),
    })
  })

  it.each([
    [{}, "sec", at("07:40"), "pending"],
    [{}, "wrong", at("07:40"), "invalid"],
    [{}, "sec", at("07:47"), "expired"],
    [{ invalidated_at: at("07:35") }, "sec", at("07:40"), "expired"],
    [{ confirmed_at: at("07:40") }, "sec", at("07:44:59"), "confirmed"],
    [{ confirmed_at: at("07:40") }, "sec", at("07:45"), "expired"],
    [{ consumed_at: at("07:40") }, "sec", at("07:41"), "used"],
  ])("gives the status for %o", async (change, secret, time, status) => {
    expect(await proto.linkStatus.call(makeSelf(change), "mlr_1", secret, time)).toBe(status)
  })

  it("consumes an open link in the same browser with the token and the secret", async () => {
    const result = await proto.consumeLink.call(
      self,
      { id: "mlr_1", secret: "sec", token: "tok" },
      at("07:40")
    )
    expect(result).toEqual({ email: "sari@example.com" })
    expect(self.updateMagicLinkRequests).toHaveBeenCalledWith({
      id: "mlr_1",
      consumed_at: at("07:40"),
      confirmed_at: at("07:40"),
    })
  })

  it("consumes a confirmed link in the original tab with the secret only", async () => {
    const self = makeSelf({ confirmed_at: at("07:40") })
    expect(await proto.consumeLink.call(self, { id: "mlr_1", secret: "sec" }, at("07:41"))).toEqual(
      {
        email: "sari@example.com",
      }
    )
  })

  it("gives no session without the secret, without a confirm, or a second time", async () => {
    expect(
      await proto.consumeLink.call(self, { id: "mlr_1", secret: "bad", token: "tok" }, at("07:40"))
    ).toBeNull()
    expect(
      await proto.consumeLink.call(self, { id: "mlr_1", secret: "sec" }, at("07:40"))
    ).toBeNull()
    const used = makeSelf({ consumed_at: at("07:40") })
    expect(
      await proto.consumeLink.call(used, { id: "mlr_1", secret: "sec", token: "tok" }, at("07:41"))
    ).toBeNull()
  })
})
