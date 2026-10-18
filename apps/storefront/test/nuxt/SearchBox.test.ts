import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { nextTick } from "vue"
import { SearchBox } from "#components"

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
const DRESS = {
  id: "p_2",
  title: "Linen dress",
  handle: "linen-dress",
  thumbnail: null,
  variants: [{ calculated_price: { calculated_amount: 650000 } }],
}

const wrappers: Awaited<ReturnType<typeof mountSuspended>>[] = []

const mountBox = async (attach = true) => {
  const wrapper = await mountSuspended(SearchBox, attach ? { attachTo: document.body } : {})
  wrappers.push(wrapper)
  return wrapper
}

// Open the panel with a text and the products of the answer.
const openWith = async (
  wrapper: Awaited<ReturnType<typeof mountSuspended>>,
  text: string,
  products: unknown[]
) => {
  const input = wrapper.get("input[type='search']")
  await input.trigger("focus")
  await input.setValue(text)
  search.active.value = true
  search.products.value = products
  await nextTick()
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

describe("SearchBox", () => {
  it("shows the products and See all results", async () => {
    const wrapper = await mountBox()
    const input = await openWith(wrapper, "linen", [LINEN])

    const panel = wrapper.get("[data-testid='search-panel']")
    expect(input.attributes("aria-expanded")).toBe("true")
    expect(input.attributes("aria-controls")).toBe(panel.attributes("id"))
    expect(panel.get("a[href='/products/linen-shirt']").text()).toContain("Rp 450.000")
    expect(panel.get("a[href='/search?q=linen']").text()).toBe("See all results")
  })

  it("says No results for the text", async () => {
    const wrapper = await mountBox()
    await openWith(wrapper, "velvet", [])

    expect(wrapper.get("[data-testid='search-panel']").text()).toContain('No results for "velvet"')
  })

  it("shows three skeleton rows while the first answer loads", async () => {
    const wrapper = await mountBox()
    search.pending.value = true
    await openWith(wrapper, "lin", [])

    const panel = wrapper.get("[data-testid='search-panel']")
    expect(panel.findAll("[data-slot='skeleton-row']")).toHaveLength(3)
    expect(panel.text()).not.toContain("No results")
  })

  it("shows no panel while the text is too short", async () => {
    const wrapper = await mountBox()
    const input = wrapper.get("input[type='search']")
    await input.trigger("focus")
    await input.setValue("l")
    await nextTick()

    expect(wrapper.find("[data-testid='search-panel']").exists()).toBe(false)
    expect(input.attributes("aria-expanded")).toBe("false")
  })

  it("opens the search page on Enter", async () => {
    const wrapper = await mountBox(false)
    await wrapper.get("input").setValue(" linen ")
    await wrapper.get("form").trigger("submit")

    expect(navigateToMock).toHaveBeenCalledWith("/search?q=linen")
  })

  it("does nothing on Enter with an empty text", async () => {
    const wrapper = await mountBox(false)
    await wrapper.get("form").trigger("submit")

    expect(navigateToMock).not.toHaveBeenCalled()
  })

  it("closes the panel on Escape and keeps the focus in the input", async () => {
    const wrapper = await mountBox()
    const input = await openWith(wrapper, "linen", [LINEN])
    ;(input.element as HTMLInputElement).focus()
    await input.trigger("keydown", { key: "Escape" })

    expect(wrapper.find("[data-testid='search-panel']").exists()).toBe(false)
    expect(document.activeElement).toBe(input.element)
  })

  it("closes the panel after a click outside the box", async () => {
    const wrapper = await mountBox()
    await openWith(wrapper, "linen", [LINEN])
    document.body.dispatchEvent(new PointerEvent("pointerdown", { bubbles: true }))
    document.body.dispatchEvent(new PointerEvent("click", { bubbles: true }))
    await nextTick()

    expect(wrapper.find("[data-testid='search-panel']").exists()).toBe(false)
  })

  it("moves the active row with the arrow keys and opens it on Enter", async () => {
    const wrapper = await mountBox()
    const input = await openWith(wrapper, "linen", [LINEN, DRESS])
    const options = wrapper.findAll("[role='option']")
    expect(options).toHaveLength(3)

    await input.trigger("keydown", { key: "ArrowDown" })
    expect(input.attributes("aria-activedescendant")).toBe(options[0]!.attributes("id"))
    expect(options[0]!.attributes("aria-selected")).toBe("true")

    await input.trigger("keydown", { key: "ArrowDown" })
    await input.trigger("keydown", { key: "ArrowDown" })
    expect(input.attributes("aria-activedescendant")).toBe(options[2]!.attributes("id"))

    await input.trigger("keydown", { key: "ArrowUp" })
    await input.trigger("keydown", { key: "Enter" })
    expect(navigateToMock).toHaveBeenCalledWith("/products/linen-dress")
    expect(wrapper.find("[data-testid='search-panel']").exists()).toBe(false)
  })
})
