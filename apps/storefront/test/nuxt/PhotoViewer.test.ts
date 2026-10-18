import { mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { defineComponent, h, ref } from "vue"
import PhotoViewer from "~/components/PhotoViewer.vue"

const FIVE = [1, 2, 3, 4, 5].map((n) => ({ id: `img_${n}`, url: `/${n}.jpg` }))

// The host keeps the open state, as the page does, and passes the events on to the test.
const Host = defineComponent({
  props: { open: { type: Boolean, default: false }, startIndex: { type: Number, default: 0 } },
  emits: ["update:open", "closed"],
  setup(props, { emit }) {
    const open = ref(props.open)
    return () =>
      h(PhotoViewer, {
        open: open.value,
        images: FIVE,
        title: "Shirt",
        startIndex: props.startIndex,
        "onUpdate:open": (value: boolean) => {
          open.value = value
          emit("update:open", value)
        },
        onClosed: (index: number) => emit("closed", index),
      })
  },
})

// The dialog renders in a portal, so the helpers query the document.
const byTestId = (id: string) => document.querySelector<HTMLElement>(`[data-testid='${id}']`)!
const button = (label: string) =>
  document.querySelector<HTMLButtonElement>(`button[aria-label='${label}']`)!

if (typeof globalThis.PointerEvent === "undefined") {
  class PointerEventShim extends MouseEvent {
    pointerId: number
    pointerType: string
    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init)
      this.pointerId = init.pointerId ?? 0
      this.pointerType = init.pointerType ?? "mouse"
    }
  }
  globalThis.PointerEvent = PointerEventShim as unknown as typeof PointerEvent
}

beforeEach(() => {
  Element.prototype.scrollTo = vi.fn()
})

afterEach(() => {
  document.body.innerHTML = ""
})

describe("PhotoViewer", () => {
  it("opens at the start photo with a counter", async () => {
    await mountSuspended(Host, { props: { open: true, startIndex: 1 }, attachTo: document.body })
    await flushPromises()

    expect(byTestId("viewer-counter").textContent).toBe("2 / 5")
    expect(document.querySelector("[role='dialog']")?.textContent).toContain("Photos of Shirt")
  })

  it("changes the photo with the arrow keys and the arrow buttons", async () => {
    await mountSuspended(Host, { props: { open: true, startIndex: 0 }, attachTo: document.body })
    await flushPromises()
    const dialog = document.querySelector<HTMLElement>("[role='dialog']")!

    expect(button("Previous photo").disabled).toBe(true)
    dialog.dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowRight", bubbles: true }))
    await flushPromises()
    expect(byTestId("viewer-counter").textContent).toBe("2 / 5")

    button("Next photo").click()
    await flushPromises()
    expect(byTestId("viewer-counter").textContent).toBe("3 / 5")
  })

  it("disables the next button on the last photo", async () => {
    await mountSuspended(Host, { props: { open: true, startIndex: 4 }, attachTo: document.body })
    await flushPromises()

    expect(button("Next photo").disabled).toBe(true)
    expect(button("Previous photo").disabled).toBe(false)
  })

  it("zooms on a click and follows the mouse", async () => {
    await mountSuspended(Host, { props: { open: true, startIndex: 0 }, attachTo: document.body })
    await flushPromises()
    const photo = button("Zoom in")
    photo.click()
    await flushPromises()

    expect(photo.getAttribute("aria-label")).toBe("Zoom out")
    photo.getBoundingClientRect = () => ({ left: 0, top: 0, width: 400, height: 200 }) as DOMRect
    photo.dispatchEvent(
      new PointerEvent("pointermove", { clientX: 100, clientY: 100, bubbles: true })
    )
    await flushPromises()
    expect(photo.querySelector("img")!.style.transformOrigin).toBe("25% 50%")

    photo.click()
    await flushPromises()
    expect(photo.getAttribute("aria-label")).toBe("Zoom in")
  })

  it("resets the zoom when the photo changes", async () => {
    await mountSuspended(Host, { props: { open: true, startIndex: 0 }, attachTo: document.body })
    await flushPromises()
    button("Zoom in").click()
    await flushPromises()

    button("Next photo").click()
    await flushPromises()
    expect(document.querySelector("button[aria-label='Zoom out']")).toBeNull()
  })

  it("closes on a swipe down", async () => {
    const wrapper = await mountSuspended(Host, {
      props: { open: true, startIndex: 0 },
      attachTo: document.body,
    })
    await flushPromises()
    const photo = button("Zoom in")
    photo.dispatchEvent(
      new PointerEvent("pointerdown", {
        pointerType: "touch",
        pointerId: 1,
        clientX: 100,
        clientY: 100,
        bubbles: true,
      })
    )
    photo.dispatchEvent(
      new PointerEvent("pointerup", {
        pointerType: "touch",
        pointerId: 1,
        clientX: 110,
        clientY: 220,
        bubbles: true,
      })
    )
    await flushPromises()

    expect(wrapper.emitted("update:open")?.at(-1)).toEqual([false])
  })

  it("does not close on a swipe to the side", async () => {
    const wrapper = await mountSuspended(Host, {
      props: { open: true, startIndex: 0 },
      attachTo: document.body,
    })
    await flushPromises()
    const photo = button("Zoom in")
    const touch = { pointerType: "touch", pointerId: 1, bubbles: true }
    photo.dispatchEvent(new PointerEvent("pointerdown", { ...touch, clientX: 100, clientY: 100 }))
    photo.dispatchEvent(new PointerEvent("pointerup", { ...touch, clientX: 260, clientY: 190 }))
    await flushPromises()

    expect(wrapper.emitted("update:open")).toBeUndefined()
  })

  it("emits closed with the current photo on Escape", async () => {
    const wrapper = await mountSuspended(Host, {
      props: { open: true, startIndex: 3 },
      attachTo: document.body,
    })
    await flushPromises()
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))
    await flushPromises()

    expect(wrapper.emitted("closed")).toEqual([[3]])
  })
})
