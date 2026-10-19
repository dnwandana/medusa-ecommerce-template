import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { afterEach, describe, expect, it, vi } from "vitest"
import { CatalogFilterSheet } from "#components"
import { EMPTY_CATALOG_STATE } from "~/utils/catalogQuery"

const { storefront } = await vi.hoisted(async () => {
  const { computed } = await import("vue")
  const { STOREFRONT_DEFAULTS } = await import("~/types/storefront")
  return {
    storefront: {
      settings: computed(() => ({
        ...STOREFRONT_DEFAULTS,
        colours: [
          { name: "Sage", hex: "#9aa68c" },
          { name: "White", hex: "#ffffff" },
        ],
      })),
    },
  }
})

mockNuxtImport("useStorefront", () => () => storefront)

type Wrapper = Awaited<ReturnType<typeof mountSuspended>>

// The sheet lives in a portal in document.body. Unmount each sheet, so the next test starts with
// no sheet.
const mounted: Wrapper[] = []

afterEach(() => {
  mounted.splice(0).forEach((wrapper) => wrapper.unmount())
})

const values = {
  sizes: [
    { key: "xs", label: "XS", ids: ["ov_xs"] },
    { key: "m", label: "M", ids: ["ov_m"] },
  ],
  colours: [
    { key: "sage", label: "Sage", ids: ["ov_sage"] },
    { key: "ink", label: "Ink", ids: ["ov_ink"] },
  ],
  fabrics: [{ key: "linen", label: "Linen", ids: ["tag_1"] }],
}

const mountSheet = async (props: Record<string, unknown> = {}) => {
  const wrapper = await mountSuspended(CatalogFilterSheet, {
    attachTo: document.body,
    props: {
      open: true,
      state: EMPTY_CATALOG_STATE,
      values,
      priceLimits: [500000, 1000000],
      count: 48,
      ...props,
    },
  })
  mounted.push(wrapper)
  await flushPromises()
  return wrapper
}

// A radio row has its text in the label around the radio, so the match reads the label.
const clickByText = (selector: string, text: string) => {
  const element = [...document.body.querySelectorAll<HTMLElement>(selector)].find(
    (item) => (item.closest("label") ?? item).textContent?.trim() === text
  )!
  element.click()
}

describe("CatalogFilterSheet", () => {
  it("shows the sections in order, with the category links", async () => {
    await mountSheet({
      categories: [
        { id: "all", name: "All", to: "/categories/women", current: true },
        { id: "pcat_2", name: "Shirts", to: "/categories/shirts", current: false },
      ],
    })
    const headings = [...document.querySelectorAll("[data-testid='filter-section-title']")]

    expect(headings.map((heading) => heading.textContent?.trim())).toEqual([
      "Category",
      "Size",
      "Colour",
      "Fabric",
      "Price",
    ])
    expect(document.querySelector("a[aria-current='page']")?.textContent?.trim()).toBe("All")
  })

  it("hides the Category section with no category", async () => {
    await mountSheet()
    const headings = [...document.querySelectorAll("[data-testid='filter-section-title']")]

    expect(headings.map((heading) => heading.textContent?.trim())).not.toContain("Category")
  })

  it("toggles a size at once", async () => {
    const wrapper = await mountSheet()
    const cell = [...document.querySelectorAll("button[aria-pressed]")].find(
      (b) => b.textContent?.trim() === "M"
    )!
    cell.dispatchEvent(new MouseEvent("click", { bubbles: true }))
    await flushPromises()

    expect(wrapper.emitted("update:state")![0]![0]).toMatchObject({ size: ["m"], page: 1 })
  })

  it("selects a price range and Any price", async () => {
    const wrapper = await mountSheet({ state: { ...EMPTY_CATALOG_STATE, price: "0-500000" } })
    clickByText("[role='radio']", "Any price")
    await flushPromises()

    expect(wrapper.emitted("update:state")![0]![0]).toMatchObject({ price: null })
  })

  it("closes with Show 48 pieces and clears all filters", async () => {
    const wrapper = await mountSheet({ state: { ...EMPTY_CATALOG_STATE, size: ["m"] } })
    clickByText("button", "Clear all")
    clickByText("button", "Show 48 pieces")
    await flushPromises()

    expect(wrapper.emitted("update:state")![0]![0]).toEqual(EMPTY_CATALOG_STATE)
    expect(wrapper.emitted("update:open")![0]).toEqual([false])
  })

  it("finds the swatch colour by the key, so a translated label keeps its swatch", async () => {
    await mountSheet({
      values: { ...values, colours: [{ key: "white", label: "Putih", ids: ["ov_w"] }] },
    })
    const label = [...document.body.querySelectorAll("label")].find(
      (element) => element.textContent?.trim() === "Putih"
    )!

    expect(label.querySelector("span[style]")?.getAttribute("style")).toContain(
      "background-color: #ffffff"
    )
  })

  it("has a labelled close button", async () => {
    await mountSheet()
    expect(document.querySelector("button[aria-label='Close filters']")).not.toBeNull()
  })
})
