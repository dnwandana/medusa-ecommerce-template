import { mountSuspended } from "@nuxt/test-utils/runtime"
import { describe, expect, it } from "vitest"
import HomeHero from "~/components/HomeHero.vue"

const campaign = {
  id: "hc_1",
  image_url: "https://assets.example/hero.jpg",
  mobile_image_url: "https://assets.example/hero-phone.jpg",
  eyebrow: "Autumn",
  title: "The *linen* edit",
  text: "Light shirts for warm days.",
  button_label: "Shop linen",
  link: "/categories/linen",
}

describe("HomeHero", () => {
  it("shows the live campaign", async () => {
    const wrapper = await mountSuspended(HomeHero, { props: { campaign } })

    expect(wrapper.find("h1").text()).toBe("The linen edit")
    expect(wrapper.find("h1 em").text()).toBe("linen")
    expect(wrapper.find("source").attributes("srcset")).toBe(campaign.mobile_image_url)
    expect(wrapper.find("source").attributes("media")).toBe("(max-width: 767px)")
    expect(wrapper.find("img").attributes("src")).toBe(campaign.image_url)
    expect(wrapper.find("img").attributes("alt")).toBe("")
    expect(wrapper.text()).toContain("Autumn")
    expect(wrapper.text()).toContain("Light shirts for warm days.")
    expect(wrapper.find("a[href='/categories/linen']").text()).toBe("Shop linen")
  })

  it("renders the staff title as text, not as markup", async () => {
    const wrapper = await mountSuspended(HomeHero, {
      props: { campaign: { ...campaign, title: "<b>Bold</b> *edit*" } },
    })

    expect(wrapper.find("h1 b").exists()).toBe(false)
    expect(wrapper.find("h1").text()).toBe("<b>Bold</b> edit")
  })

  it("leaves out the empty campaign parts", async () => {
    const wrapper = await mountSuspended(HomeHero, {
      props: { campaign: { ...campaign, eyebrow: null, text: null, mobile_image_url: null } },
    })

    expect(wrapper.find("source").exists()).toBe(false)
    expect(wrapper.text()).not.toContain("Autumn")
    expect(wrapper.text()).not.toContain("Light shirts")
  })

  it("shows the text hero with no campaign", async () => {
    const wrapper = await mountSuspended(HomeHero, { props: { campaign: null } })

    expect(wrapper.find("img").exists()).toBe(false)
    expect(wrapper.findAll("h1")).toHaveLength(1)
    expect(wrapper.find("h1").text()).toBe("Clothes for the days you actually have.")
    expect(wrapper.find("section").classes()).toContain("bg-backdrop-sand")
    expect(wrapper.find("a[href='/products']").text()).toBe("View all products")
  })
})
