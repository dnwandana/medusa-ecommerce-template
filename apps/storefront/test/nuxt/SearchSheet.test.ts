import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { defineComponent, h } from "vue"
import { SearchSheet } from "#components"

const { search, navigateToMock } = await vi.hoisted(async () => {
  const { ref } = await import("vue")
  return {
    search: { products: ref<unknown[]>([]), pending: ref(false), active: ref(false) },
    navigateToMock: vi.fn(),
  }
})

mockNuxtImport("useSearchSuggestions", () => () => search)
mockNuxtImport("navigateTo", () => navigateToMock)

const LINEN = {
  id: "p_1",
  title: "Linen shirt",
  handle: "linen-shirt",
  thumbnail: "/l.jpg",
  variants: [{ calculated_price: { calculated_amount: 450000 } }],
}

// Passes the open prop through and emits each update, as v-model:open does.
const Host = defineComponent({
  props: { open: { type: Boolean, default: false } },
  emits: ["update:open"],
  setup(props, { emit }) {
    return () =>
      h(SearchSheet, {
        open: props.open,
        "onUpdate:open": (value: boolean) => emit("update:open", value),
      })
  },
})

const wrappers: Awaited<ReturnType<typeof mountSuspended>>[] = []

const mountHost = async (open: boolean) => {
  const wrapper = await mountSuspended(Host, { props: { open }, attachTo: document.body })
  wrappers.push(wrapper)
  return wrapper
}

const typeText = async (text: string) => {
  const input = document.querySelector<HTMLInputElement>("input[type='search']")!
  input.value = text
  input.dispatchEvent(new Event("input"))
  await flushPromises()
  return input
}

afterEach(() => {
  wrappers.splice(0).forEach((wrapper) => wrapper.unmount())
  document.body.innerHTML = ""
})

beforeEach(() => {
  search.products.value = []
  search.pending.value = false
  search.active.value = false
  navigateToMock.mockReset()
})

describe("SearchSheet", () => {
  it("fills the screen and puts the focus in the input", async () => {
    const wrapper = await mountHost(false)
    await wrapper.setProps({ open: true })
    await flushPromises()
    const content = document.querySelector("[data-slot='sheet-content']")!

    expect(content.className).toContain("h-dvh")
    expect(document.activeElement).toBe(content.querySelector("input[type='search']"))
  })

  it("lists the products and See all results", async () => {
    await mountHost(true)
    await typeText("linen")
    search.active.value = true
    search.products.value = [LINEN]
    await flushPromises()

    expect(document.querySelector("a[href='/products/linen-shirt']")?.textContent).toContain(
      "Rp 450.000"
    )
    expect(document.querySelector("a[href='/search?q=linen']")?.textContent).toContain(
      "See all results"
    )
  })

  it("says No results for the text", async () => {
    await mountHost(true)
    await typeText("velvet")
    search.active.value = true
    await flushPromises()

    expect(document.querySelector("[data-slot='sheet-content']")?.textContent).toContain(
      'No results for "velvet"'
    )
  })

  it("opens the search page and closes on Enter", async () => {
    const wrapper = await mountHost(true)
    const input = await typeText("linen")
    input.form!.dispatchEvent(new Event("submit", { cancelable: true }))
    await flushPromises()

    expect(navigateToMock).toHaveBeenCalledWith("/search?q=linen")
    expect(wrapper.emitted("update:open")?.at(-1)).toEqual([false])
  })

  it("closes after a click on a product", async () => {
    const wrapper = await mountHost(true)
    await typeText("linen")
    search.active.value = true
    search.products.value = [LINEN]
    await flushPromises()
    document.querySelector<HTMLAnchorElement>("a[href='/products/linen-shirt']")!.click()
    await flushPromises()

    expect(wrapper.emitted("update:open")?.at(-1)).toEqual([false])
  })

  it("keeps the text when the sheet closes and opens again", async () => {
    const wrapper = await mountHost(true)
    await typeText("linen")
    await wrapper.setProps({ open: false })
    await flushPromises()
    await wrapper.setProps({ open: true })
    await flushPromises()

    expect(document.querySelector<HTMLInputElement>("input[type='search']")!.value).toBe("linen")
  })

  it("has a labelled close button", async () => {
    await mountHost(true)

    expect(document.querySelector("button[aria-label='Close search']")).not.toBeNull()
  })
})
