import { describe, expect, it, vi } from "vitest"

// The unit project has no Nuxt auto-imports, so defineAppConfig must exist before the import.
vi.stubGlobal("defineAppConfig", (config: unknown) => config)
const { default: appConfig } = await import("../../app/app.config")

describe("app config", () => {
  it("names the brand Everyday", () => {
    expect(appConfig.brand.name).toBe("Everyday")
  })
})
