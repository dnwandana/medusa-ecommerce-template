import MagicLinkModule, { MAGIC_LINK_MODULE } from ".."
import MagicLinkModuleService from "../service"

describe("magic link module", () => {
  it("has the module name magicLink", () => {
    expect(MAGIC_LINK_MODULE).toBe("magicLink")
  })

  it("exposes the request as a linkable", () => {
    expect(MagicLinkModule.linkable.magicLinkRequest).toBeDefined()
  })

  it("has the generated methods for the requests", () => {
    const proto = MagicLinkModuleService.prototype as any
    for (const name of [
      "createMagicLinkRequests",
      "listMagicLinkRequests",
      "updateMagicLinkRequests",
    ]) {
      expect(typeof proto[name]).toBe("function")
    }
  })
})
