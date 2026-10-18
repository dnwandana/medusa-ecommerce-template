import StorefrontModule, { STOREFRONT_MODULE } from ".."

describe("storefront module", () => {
  it("has the module name storefront", () => {
    expect(STOREFRONT_MODULE).toBe("storefront")
    expect(StorefrontModule.linkable.storefrontSetting).toBeDefined()
  })
})
