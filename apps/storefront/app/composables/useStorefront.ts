import type { ComputedRef } from "vue"
import type { NuxtApp } from "#app"
import { STOREFRONT_DEFAULTS, type HomeCampaign, type StorefrontSettings } from "~/types/storefront"

// Keeps the running settings request of each Nuxt app, so callers at the same time share it.
// The key is the Nuxt app, so one server request never reads the promise of another.
const pendingSettings = new WeakMap<NuxtApp, Promise<StorefrontSettings>>()

// Returns the settings of the storefront and the live home campaign.
export function useStorefront(): {
  settings: ComputedRef<StorefrontSettings>
  ensureSettings(): Promise<StorefrontSettings>
  getHomeCampaign(): Promise<HomeCampaign | null>
} {
  // The Nuxt context is not available after an await. Get the composables here.
  const sdk = useMedusa()
  const nuxtApp = useNuxtApp()
  const state = useState<StorefrontSettings | null>("storefront-settings", () => null)

  const settings = computed(() => state.value ?? STOREFRONT_DEFAULTS)

  async function load(): Promise<StorefrontSettings> {
    try {
      const response = await sdk.client.fetch<StorefrontSettings>("/store/storefront/settings")
      state.value = response
      return response
    } catch {
      // The pages render with the defaults. The state stays empty, so a later call tries again.
      return STOREFRONT_DEFAULTS
    }
  }

  function ensureSettings(): Promise<StorefrontSettings> {
    if (state.value) {
      return Promise.resolve(state.value)
    }
    let pending = pendingSettings.get(nuxtApp)
    if (!pending) {
      pending = load().finally(() => pendingSettings.delete(nuxtApp))
      pendingSettings.set(nuxtApp, pending)
    }
    return pending
  }

  async function getHomeCampaign(): Promise<HomeCampaign | null> {
    try {
      const { campaign } = await sdk.client.fetch<{ campaign: HomeCampaign | null }>(
        "/store/storefront/home-campaign"
      )
      return campaign
    } catch {
      // The home page shows no campaign when the backend does not answer.
      return null
    }
  }

  return { settings, ensureSettings, getHomeCampaign }
}
