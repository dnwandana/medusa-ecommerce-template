import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import ContactPage from "~/pages/contact.vue"
import enSource from "~~/i18n/locales/en.json?raw"
import idSource from "~~/i18n/locales/id.json?raw"
import { readHead } from "./helpers/head"

// The i18n plugin compiles a plain JSON import into message functions. The raw text keeps the strings.
type Messages = { pages: { contact: { title: string; intro: string } } }
const en = JSON.parse(enSource) as Messages
const id = JSON.parse(idSource) as Messages

const { getDetails } = vi.hoisted(() => ({ getDetails: vi.fn() }))
mockNuxtImport("useBankTransfer", () => () => ({ getDetails }))

beforeEach(() => {
  clearNuxtData()
  getDetails.mockReset()
})

afterEach(async () => {
  await useNuxtApp().$i18n.setLocale("en")
})

describe("contact page", () => {
  it("shows the WhatsApp number and the email of the store", async () => {
    getDetails.mockResolvedValue({
      bank_accounts: [
        { id: "ba_1", bank_name: "BCA", account_number: "123", account_holder: "Everyday" },
      ],
      contact: { email: "halo@everyday.id", whatsapp: "+62 812-3456-7890" },
    })
    const wrapper = await mountSuspended(ContactPage, { route: "/contact" })
    expect(wrapper.get("h1").text()).toBe("Contact us")
    expect(wrapper.get("a[href='https://wa.me/6281234567890']").text()).toBe("+62 812-3456-7890")
    expect(wrapper.get("a[href='mailto:halo@everyday.id']").text()).toBe("halo@everyday.id")
    // The page is for contact only. The bank accounts stay on the order page.
    expect(wrapper.text()).not.toContain("BCA")
  })

  it("shows only the values that are set", async () => {
    getDetails.mockResolvedValue({
      bank_accounts: [],
      contact: { email: "halo@everyday.id", whatsapp: null },
    })
    const wrapper = await mountSuspended(ContactPage, { route: "/contact" })
    expect(wrapper.find("a[href^='https://wa.me/']").exists()).toBe(false)
    expect(wrapper.get("a[href='mailto:halo@everyday.id']").exists()).toBe(true)
    expect(wrapper.text()).not.toContain("The contact details did not load.")
  })

  it("shows the unavailable text when the store has no contact values", async () => {
    getDetails.mockResolvedValue({ bank_accounts: [], contact: { email: null, whatsapp: null } })
    const wrapper = await mountSuspended(ContactPage, { route: "/contact" })
    expect(wrapper.text()).toContain("The contact details did not load. Try again later.")
  })

  it("shows the unavailable text when the request fails", async () => {
    getDetails.mockRejectedValue(new Error("down"))
    const wrapper = await mountSuspended(ContactPage, { route: "/contact" })
    expect(wrapper.text()).toContain("The contact details did not load. Try again later.")
  })

  it("writes the contact head from the locale file", async () => {
    getDetails.mockResolvedValue({ bank_accounts: [], contact: { email: null, whatsapp: null } })
    await mountSuspended(ContactPage, { route: "/contact" })
    const head = await readHead()

    expect(head.title).toBe(`${en.pages.contact.title} | Everyday`)
    expect(head.meta("description")).toBe(en.pages.contact.intro)
    expect(head.links("canonical")).toEqual([{ href: "http://localhost:3000/contact" }])
    expect(head.meta("og:image")).toBe("http://localhost:3000/og-default.jpg")
  })

  it("writes the Bahasa Indonesia contact head in the id locale", async () => {
    getDetails.mockResolvedValue({ bank_accounts: [], contact: { email: null, whatsapp: null } })
    await mountSuspended(ContactPage, { route: "/id/contact" })
    const head = await readHead()

    expect(head.title).toBe(`${id.pages.contact.title} | Everyday`)
    expect(head.meta("description")).toBe(id.pages.contact.intro)
  })
})
