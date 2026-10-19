import { resolveTags } from "@unhead/vue/utils"
import { disableAutoUnmount, enableAutoUnmount } from "@vue/test-utils"
import { afterEach } from "vitest"
import { nextTick } from "vue"
import { injectHead, useNuxtApp } from "#imports"

export type HeadView = {
  title: string | null
  htmlAttrs: Record<string, string>
  meta(key: string): string | null // matches the name or the property attribute
  links(rel: string): { href: string; hreflang?: string }[]
  jsonLd(): Record<string, unknown>[] // parsed application/ld+json scripts
}

type Tag = ReturnType<typeof resolveTags>[number]

// mountSuspended does not unmount the component of the last test. A mounted component keeps its
// head entries, so they would show in the head of the next test. Thus each file that imports this
// helper unmounts all wrappers after each test. Unmount also removes the attachTo container and
// the teleported nodes. The hook runs after the afterEach hooks of the file, so a file must not
// clear document.body: Vue cannot unmount a teleport whose nodes are gone.
let unmountAll = () => {}
const trackWrappers = () =>
  enableAutoUnmount((callback) => {
    unmountAll = callback
  })
trackWrappers()

afterEach(() => {
  try {
    unmountAll()
  } catch (error) {
    // Drop the wrapper list, so that one failed unmount does not fail all the next tests.
    disableAutoUnmount()
    trackWrappers()
    throw new Error(
      "readHead helper: the unmount after the test failed. Do not clear document.body in afterEach.",
      { cause: error }
    )
  }
})

function attr(value: unknown): string {
  if (value instanceof Set) {
    return [...value].join(" ")
  }
  if (value instanceof Map) {
    return [...value].map(([key, entry]) => `${key}:${entry}`).join(";")
  }
  return String(value)
}

// Returns the head tags that Unhead resolves for the test Nuxt app. The tags come from the
// head entries, not from `document`, so the result does not depend on the DOM render timing.
export async function readHead(): Promise<HeadView> {
  // useHead patches its entry in a watcher. The tick runs the watchers of a state change.
  await nextTick()
  const tags: Tag[] = resolveTags(injectHead(useNuxtApp()))
  const byTag = (name: string) => tags.filter((tag) => tag.tag === name)

  const htmlAttrs: Record<string, string> = {}
  for (const tag of byTag("htmlAttrs")) {
    for (const [key, value] of Object.entries(tag.props)) {
      if (value !== null && value !== undefined) {
        htmlAttrs[key] = attr(value)
      }
    }
  }

  const title = byTag("title")[0]?.textContent

  return {
    title: typeof title === "string" ? title : null,
    htmlAttrs,
    meta(key) {
      const tag = byTag("meta").find(
        (meta) => meta.props.name === key || meta.props.property === key
      )
      return tag?.props.content === undefined ? null : attr(tag.props.content)
    },
    links(rel) {
      return byTag("link")
        .filter((link) => link.props.rel === rel)
        .map((link) => ({
          href: attr(link.props.href),
          ...(link.props.hreflang === undefined ? {} : { hreflang: attr(link.props.hreflang) }),
        }))
    },
    jsonLd() {
      return byTag("script")
        .filter((script) => script.props.type === "application/ld+json")
        .map((script) => JSON.parse(String(script.innerHTML ?? script.textContent)))
    },
  }
}
