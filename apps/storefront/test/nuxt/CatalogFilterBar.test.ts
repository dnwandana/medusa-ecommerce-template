import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { afterEach, describe, expect, it, vi } from "vitest"
import { CatalogFilterBar } from "#components"
import { EMPTY_CATALOG_STATE } from "~/utils/catalogQuery"

const { storefront } = await vi.hoisted(async () => {
  const { computed } = await import("vue")
  const { STOREFRONT_DEFAULTS } = await import("~/types/storefront")
  return {
    storefront: {
      settings: computed(() => ({
        ...STOREFRONT_DEFAULTS,
        colours: [{ name: "Sage", hex: "#9aa68c" }],
      })),
    },
  }
})

mockNuxtImport("useStorefront", () => () => storefront)

type Wrapper = Awaited<ReturnType<typeof mountSuspended>>

// An open menu lives in a portal in document.body. Unmount each bar, so the next test starts with
// no menu.
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

const mountBar = async (props: Record<string, unknown> = {}) => {
  const wrapper = await mountSuspended(CatalogFilterBar, {
    attachTo: document.body,
    props: {
      state: EMPTY_CATALOG_STATE,
      values,
      priceLimits: [500000, 1000000],
      count: 48,
      ...props,
    },
  })
  mounted.push(wrapper)
  return wrapper
}

const findButton = (wrapper: Wrapper, text: string) =>
  wrapper.findAll("button").find((button) => button.text().trim() === text)!

// Opens a dropdown as a pointer does, as the other dropdown tests do.
const openMenu = async (wrapper: Wrapper, text: string) => {
  const trigger = findButton(wrapper, text)
  await trigger.trigger("pointerdown", { button: 0, ctrlKey: false })
  await trigger.trigger("click")
  await flushPromises()
}

const clickMenuItem = async (text: string) => {
  const item = [...document.body.querySelectorAll("[role='menuitemcheckbox']")].find(
    (element) => element.textContent?.trim() === text
  ) as HTMLElement
  item.click()
  await flushPromises()
}

describe("CatalogFilterBar", () => {
  it("shows the four filters, the count and the sort", async () => {
    const wrapper = await mountBar()
    const desktop = wrapper.find("[data-testid='filter-row']")

    expect(desktop.text()).toContain("All filters")
    for (const name of ["Size", "Colour", "Fabric", "Price"]) {
      expect(desktop.text()).toContain(name)
    }
    expect(desktop.text()).toContain("48 pieces")
    expect(
      wrapper
        .find("select")
        .findAll("option")
        .map((option) => option.text())
    ).toEqual(["Newest", "Price, low to high", "Price, high to low"])
  })

  it("hides Price with no limit and a filter with no value", async () => {
    const wrapper = await mountBar({ priceLimits: [], values: { ...values, fabrics: [] } })
    const desktop = wrapper.find("[data-testid='filter-row']")

    expect(desktop.text()).not.toContain("Price")
    expect(desktop.text()).not.toContain("Fabric")
  })

  it("adds a colour and goes back to page 1", async () => {
    const wrapper = await mountBar({ state: { ...EMPTY_CATALOG_STATE, page: 3 } })
    await openMenu(wrapper, "Colour")
    await clickMenuItem("Sage")

    expect(wrapper.emitted("update:state")![0]![0]).toMatchObject({ colour: ["sage"], page: 1 })
    expect(document.querySelector("[role='menu']")).not.toBeNull()
  })

  it("shows the colour dot of a colour with a hex", async () => {
    const wrapper = await mountBar()
    await openMenu(wrapper, "Colour")
    const items = [...document.body.querySelectorAll("[role='menuitemcheckbox']")]

    expect(items[0]!.querySelector("span[style]")?.getAttribute("style")).toContain(
      "background-color"
    )
    expect(items[1]!.querySelector("span[style]")).toBeNull()
  })

  it("shows the number of selected values on the trigger", async () => {
    const wrapper = await mountBar({ state: { ...EMPTY_CATALOG_STATE, size: ["xs", "m"] } })

    expect(findButton(wrapper, "Size (2)")).toBeDefined()
  })

  it("changes the sort", async () => {
    const wrapper = await mountBar()
    await wrapper.find("select").setValue("price-asc")

    expect(wrapper.emitted("update:state")![0]![0]).toMatchObject({ sort: "price-asc" })
  })

  it("shows the active filters as chips with Clear all", async () => {
    const state = {
      ...EMPTY_CATALOG_STATE,
      size: ["xs"],
      fabric: ["linen"],
      price: "0-500000",
      sort: "price-desc" as const,
    }
    const wrapper = await mountBar({ state })

    expect(
      wrapper.findAll("button[aria-label^='Remove filter:']").map((chip) => chip.text())
    ).toEqual(["Size XS", "Linen", "Under Rp 500.000"])
    await wrapper.find("button[aria-label='Remove filter: Linen']").trigger("click")
    expect(wrapper.emitted("update:state")![0]![0]).toMatchObject({ fabric: [] })

    await findButton(wrapper, "Clear all").trigger("click")
    expect(wrapper.emitted("update:state")![1]![0]).toEqual({
      ...EMPTY_CATALOG_STATE,
      sort: "price-desc",
    })
  })

  it("shows the phone Filter button with the active count", async () => {
    const wrapper = await mountBar({
      state: { ...EMPTY_CATALOG_STATE, size: ["m"], colour: ["sage"] },
    })
    const button = wrapper.find("[data-testid='filter-button']")

    expect(button.text()).toBe("Filter (2)")
    await button.trigger("click")
    expect(wrapper.emitted("open-sheet")).toHaveLength(1)
  })
})
