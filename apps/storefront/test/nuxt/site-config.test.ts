import { describe, expect, it } from "vitest"

describe("site config", () => {
  it("has the site URL with the development default", () => {
    expect(useRuntimeConfig().public.siteUrl).toBe("http://localhost:3000")
  })

  it("gives each locale its BCP 47 language tag", () => {
    const { locales } = useNuxtApp().$i18n
    expect(
      locales.value.map((locale) => [
        (locale as { code: string }).code,
        (locale as { language?: string }).language,
      ])
    ).toEqual([
      ["en", "en-US"],
      ["id", "id-ID"],
    ])
  })
})
