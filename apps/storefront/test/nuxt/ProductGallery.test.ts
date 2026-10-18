import { mountSuspended } from "@nuxt/test-utils/runtime"
import { describe, expect, it } from "vitest"
import ProductGallery from "~/components/ProductGallery.vue"

const IMAGES = [
  { id: "img_1", url: "/1.jpg" },
  { id: "img_2", url: "/2.jpg" },
  { id: "img_3", url: "/3.jpg" },
]

describe("ProductGallery", () => {
  it("draws each photo as a labelled button", async () => {
    const wrapper = await mountSuspended(ProductGallery, {
      props: { images: IMAGES, title: "Shirt" },
    })
    const buttons = wrapper.findAll("button")

    expect(wrapper.get("[aria-label='Product photos']").exists()).toBe(true)
    expect(buttons.map((button) => button.attributes("aria-label"))).toEqual([
      "Open photo 1 of 3",
      "Open photo 2 of 3",
      "Open photo 3 of 3",
    ])
    expect(buttons[0]!.get("img").attributes("fetchpriority")).toBe("high")
    expect(buttons[1]!.get("img").attributes("loading")).toBe("lazy")
  })

  it("emits open with the index of the photo", async () => {
    const wrapper = await mountSuspended(ProductGallery, {
      props: { images: IMAGES, title: "Shirt" },
    })
    await wrapper.findAll("button")[1]!.trigger("click")
    expect(wrapper.emitted("open")).toEqual([[1]])
  })

  it("shows the progress of the carousel", async () => {
    const wrapper = await mountSuspended(ProductGallery, {
      props: { images: IMAGES, title: "Shirt" },
    })
    const list = wrapper.get("[aria-label='Product photos']").element as HTMLElement
    Object.defineProperty(list, "clientWidth", { value: 300 })
    list.scrollLeft = 300
    await wrapper.get("[aria-label='Product photos']").trigger("scroll")

    expect(wrapper.get("[role='progressbar']").attributes("aria-valuenow")).toBe("67")
  })

  it("shows no progress rule with one photo", async () => {
    const wrapper = await mountSuspended(ProductGallery, {
      props: { images: IMAGES.slice(0, 1), title: "Shirt" },
    })
    expect(wrapper.find("[role='progressbar']").exists()).toBe(false)
  })

  it("shows the badge label on the first photo", async () => {
    const wrapper = await mountSuspended(ProductGallery, {
      props: { images: IMAGES, title: "Shirt", badgeLabel: "Sale" },
    })
    expect(wrapper.findAll("button")[0]!.text()).toContain("Sale")
  })

  it("shows a placeholder that is not a button with no image", async () => {
    const wrapper = await mountSuspended(ProductGallery, { props: { images: [], title: "Shirt" } })
    expect(wrapper.find("button").exists()).toBe(false)
    expect(wrapper.find("[aria-label='Shirt']").exists()).toBe(true)
    expect(wrapper.find("[role='progressbar']").exists()).toBe(false)
  })

  it("puts the focus back on a photo", async () => {
    const wrapper = await mountSuspended(ProductGallery, {
      props: { images: IMAGES, title: "Shirt" },
      attachTo: document.body,
    })
    ;(wrapper.vm as unknown as { focusPhoto(index: number): void }).focusPhoto(2)
    expect(document.activeElement?.getAttribute("aria-label")).toBe("Open photo 3 of 3")
    wrapper.unmount()
  })
})
