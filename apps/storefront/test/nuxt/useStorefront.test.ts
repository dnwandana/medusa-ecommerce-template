import { mockNuxtImport } from "@nuxt/test-utils/runtime"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { clearNuxtState, useStorefront } from "#imports"
import { STOREFRONT_DEFAULTS } from "~/types/storefront"

const { sdk } = vi.hoisted(() => ({ sdk: { client: { fetch: vi.fn() } } }))
mockNuxtImport("useMedusa", () => () => sdk)

const SETTINGS = {
  new_badge_days: 14,
  low_stock_threshold: 3,
  colours: [{ name: "Sage", hex: "#9aa68c" }],
  price_limits: [500000, 1000000],
}

beforeEach(() => {
  clearNuxtState()
  sdk.client.fetch.mockReset()
})

describe("useStorefront", () => {
  it("loads the settings one time", async () => {
    sdk.client.fetch.mockResolvedValue(SETTINGS)
    const { settings, ensureSettings } = useStorefront()

    expect(settings.value).toEqual(STOREFRONT_DEFAULTS)
    await ensureSettings()
    await useStorefront().ensureSettings()

    expect(settings.value).toEqual(SETTINGS)
    expect(sdk.client.fetch).toHaveBeenCalledTimes(1)
    expect(sdk.client.fetch).toHaveBeenCalledWith("/store/storefront/settings")
  })

  it("shares one request between callers at the same time", async () => {
    sdk.client.fetch.mockResolvedValue(SETTINGS)

    const results = await Promise.all([
      useStorefront().ensureSettings(),
      useStorefront().ensureSettings(),
    ])

    expect(results).toEqual([SETTINGS, SETTINGS])
    expect(sdk.client.fetch).toHaveBeenCalledTimes(1)
  })

  it("gives the defaults when the settings do not load, and tries again later", async () => {
    sdk.client.fetch.mockRejectedValueOnce(new Error("down")).mockResolvedValue(SETTINGS)

    expect(await useStorefront().ensureSettings()).toEqual(STOREFRONT_DEFAULTS)
    expect(await useStorefront().ensureSettings()).toEqual(SETTINGS)
  })

  it("returns the live campaign or null", async () => {
    const campaign = { id: "hc_1", title: "The *linen* edit", link: "/products" }
    sdk.client.fetch.mockResolvedValueOnce({ campaign })
    expect(await useStorefront().getHomeCampaign()).toEqual(campaign)

    sdk.client.fetch.mockRejectedValueOnce(new Error("down"))
    expect(await useStorefront().getHomeCampaign()).toBeNull()
  })
})
