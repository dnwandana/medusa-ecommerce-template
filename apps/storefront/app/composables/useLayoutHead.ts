import { fullTitle } from "~/utils/seoText"

// Sets the head parts that all pages of a layout share: the `lang` attribute and the title
// template. Each page then sets only its own title, and the template adds the store name.
// The layout writes no canonical or hreflang link, because the private pages must have none.
export function useLayoutHead(): void {
  const { brand } = useAppConfig()
  // The language tag of the locale ("en-US") is more exact than the locale code ("en").
  const head = useLocaleHead({ dir: false, lang: true, seo: false })

  useHead(() => ({ htmlAttrs: { lang: head.value.htmlAttrs.lang } }))
  useHead({ titleTemplate: (title?: string) => fullTitle(title ?? "", brand.name) })
}
