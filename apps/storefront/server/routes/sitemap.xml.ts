import { loadSitemapSources, sitemapResponse, type FetchStore } from "../utils/sitemapSources"

// Nitro caches the XML for 1 hour. A thrown error is not stored, so a backend failure gives a 503
// for this request only.
export default defineCachedEventHandler(
  async (event) => {
    const config = useRuntimeConfig(event)
    // The server backend URL, because the public URL can be unreachable from the container.
    const fetchStore: FetchStore = <T>(path: string, query: Record<string, string | number>) =>
      $fetch(path, {
        baseURL: config.medusaBackendUrl,
        query,
        headers: { "x-publishable-api-key": config.public.medusaPublishableKey },
      }) as Promise<T>
    const xml = await sitemapResponse(() => loadSitemapSources(fetchStore), config.public.siteUrl)
    setResponseHeader(event, "Content-Type", "application/xml; charset=utf-8")
    return xml
  },
  { name: "sitemap", maxAge: 3600 }
)
