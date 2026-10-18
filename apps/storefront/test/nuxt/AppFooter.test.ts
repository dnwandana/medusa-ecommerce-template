import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { AppFooter, HairlineAccordion, LanguageSwitcher, TrustLines } from "#components"

const { homeCategories } = await vi.hoisted(async () => {
  const { ref } = await import("vue")
  return {
    homeCategories: ref<{ id: string; name: string; handle: string; image: string | null }[]>([]),
  }
})

mockNuxtImport("useHomeCategories", () => () => ({
  categories: computed(() => homeCategories.value),
  pending: ref(false),
}))

beforeEach(() => {
  homeCategories.value = [
    { id: "c1", name: "Women", handle: "women", image: null },
    { id: "c2", name: "Men", handle: "men", image: null },
  ]
})

describe("TrustLines", () => {
  it("shows the shipping line and the payment line", async () => {
    const wrapper = await mountSuspended(TrustLines)

    expect(wrapper.text()).toContain("We ship to all of Indonesia.")
    expect(wrapper.text()).toContain("Secure payment.")
  })
})

describe("AppFooter", () => {
  it("lists the shop, help and about links", async () => {
    const wrapper = await mountSuspended(AppFooter)
    const desktop = wrapper.get("[data-slot='footer-columns']")
    const hrefs = desktop.findAll("a").map((a) => a.attributes("href"))

    expect(hrefs).toEqual([
      "/categories/women",
      "/categories/men",
      "/products",
      "/delivery",
      "/returns",
      "/contact",
      "/account/orders",
      "/about",
    ])
    expect(desktop.findAll("h2").map((h) => h.text())).toEqual(["Shop", "Help", "About"])
  })

  it("shows only All products in the shop column when no home category exists", async () => {
    homeCategories.value = []
    const wrapper = await mountSuspended(AppFooter)
    const desktop = wrapper.get("[data-slot='footer-columns']")

    expect(desktop.find("a[href^='/categories/']").exists()).toBe(false)
    expect(desktop.find("a[href='/products']").text()).toBe("All products")
  })

  it("gives the phone view a closed accordion with the same columns", async () => {
    const wrapper = await mountSuspended(AppFooter)
    const accordion = wrapper.getComponent(HairlineAccordion)

    expect(accordion.props("items").map((item: { id: string }) => item.id)).toEqual([
      "shop",
      "help",
      "about",
    ])
    expect(accordion.props("defaultOpen") ?? []).toEqual([])
    expect(accordion.find("a[href='/contact']").exists()).toBe(true)
  })

  it("shows the bottom row with the copyright and the payment line", async () => {
    const wrapper = await mountSuspended(AppFooter)
    const bottom = wrapper.get("[data-slot='footer-bottom']")

    expect(bottom.text()).toContain(`© ${new Date().getFullYear()} Everyday`)
    expect(bottom.text()).toContain("We accept bank transfer")
    expect(bottom.find("a[href='/privacy']").exists()).toBe(true)
    expect(bottom.find("a[href='/terms']").exists()).toBe(true)
    expect(bottom.findComponent(LanguageSwitcher).props("variant")).toBe("footer")
  })

  it("has no newsletter and no trust lines", async () => {
    const wrapper = await mountSuspended(AppFooter)

    expect(wrapper.find("input[type='email']").exists()).toBe(false)
    expect(wrapper.text()).not.toContain("Secure payment.")
  })
})
