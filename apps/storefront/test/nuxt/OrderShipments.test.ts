import { mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { afterEach, describe, expect, it, vi } from "vitest"
import OrderShipments from "~/components/OrderShipments.vue"
import type { TrackingLabel, TrackingShipment } from "~/composables/useOrders"

const shipment = (
  id: string,
  labels: TrackingLabel[],
  shipped_at = "2026-10-20T02:00:00.000Z"
): TrackingShipment => ({
  id,
  shipped_at,
  delivered_at: null,
  items: [],
  labels,
})

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("OrderShipments", () => {
  it("shows the ship date, the option and the tracking number", async () => {
    const wrapper = await mountSuspended(OrderShipments, {
      props: {
        optionName: "Standard Shipping",
        shipments: [
          shipment("ful_1", [
            {
              tracking_number: "JP1234567890",
              tracking_url: "https://track.example.com/JP1234567890",
            },
          ]),
        ],
      },
    })
    expect(wrapper.get("h2").text()).toBe("Shipment")
    const row = wrapper.get('[data-testid="shipment-ful_1"]')
    expect(row.text()).toContain("Shipped on 20 October 2026 with Standard Shipping.")
    expect(row.get('[data-testid="tracking-number"]').text()).toBe("JP1234567890")
    expect(row.get('[data-testid="copy-tracking"]').attributes("aria-label")).toBe(
      "Copy JP1234567890"
    )
    const link = row.get('[data-testid="track-parcel"]')
    expect(link.attributes("href")).toBe("https://track.example.com/JP1234567890")
    expect(link.attributes("target")).toBe("_blank")
    expect(link.attributes("rel")).toBe("noopener noreferrer")
    expect(link.text()).toContain("Track your parcel")
    expect(link.get(".sr-only").text()).toBe("(opens in a new tab)")
  })

  it.each([["http://track.example.com/JP1"], ["javascript:alert(1)"]])(
    "shows only the number and Copy for the URL %s",
    async (url) => {
      const wrapper = await mountSuspended(OrderShipments, {
        props: {
          optionName: "Standard Shipping",
          shipments: [shipment("ful_1", [{ tracking_number: "JP1", tracking_url: url }])],
        },
      })
      expect(wrapper.find('[data-testid="track-parcel"]').exists()).toBe(false)
      expect(wrapper.find('[data-testid="copy-tracking"]').exists()).toBe(true)
      expect(wrapper.html()).not.toContain(url)
    }
  )

  it("shows one row for each shipment", async () => {
    const wrapper = await mountSuspended(OrderShipments, {
      props: {
        optionName: null,
        shipments: [
          shipment("ful_1", [{ tracking_number: "JP1", tracking_url: null }]),
          shipment("ful_2", [], "2026-10-21T02:00:00.000Z"),
        ],
      },
    })
    expect(wrapper.findAll('[data-testid^="shipment-"]')).toHaveLength(2)
    expect(wrapper.get('[data-testid="shipment-ful_2"]').text()).toContain(
      "Shipped on 21 October 2026."
    )
    expect(
      wrapper.get('[data-testid="shipment-ful_2"]').find('[data-testid="tracking-number"]').exists()
    ).toBe(false)
  })

  it("copies the tracking number and shows Copied on the clicked button only", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal("navigator", { clipboard: { writeText } })
    const wrapper = await mountSuspended(OrderShipments, {
      props: {
        optionName: null,
        shipments: [
          shipment("ful_1", [{ tracking_number: "JP1", tracking_url: null }]),
          shipment("ful_2", [{ tracking_number: "JP1", tracking_url: null }]),
        ],
      },
    })

    await wrapper.findAll('[data-testid="copy-tracking"]')[1]!.trigger("click")
    await flushPromises()

    expect(writeText).toHaveBeenCalledWith("JP1")
    const buttons = wrapper.findAll('[data-testid="copy-tracking"]')
    // Two shipments have the same number. The Copied text stays on the clicked button.
    expect(buttons[1]!.text()).toContain("Copied")
    expect(buttons[0]!.text()).not.toContain("Copied")
  })

  it("shows the hand-copy text when the clipboard fails", async () => {
    vi.stubGlobal("navigator", {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
    })
    const wrapper = await mountSuspended(OrderShipments, {
      props: {
        optionName: null,
        shipments: [shipment("ful_1", [{ tracking_number: "JP1", tracking_url: null }])],
      },
    })

    await wrapper.get('[data-testid="copy-tracking"]').trigger("click")
    await flushPromises()

    expect(wrapper.get('[role="status"]').text()).toBe("Select the number and copy it by hand.")
    expect(wrapper.text()).not.toContain("Copied")
  })

  it("shows the hand-copy text when the browser has no clipboard", async () => {
    vi.stubGlobal("navigator", {})
    const wrapper = await mountSuspended(OrderShipments, {
      props: {
        optionName: null,
        shipments: [shipment("ful_1", [{ tracking_number: "JP1", tracking_url: null }])],
      },
    })

    await wrapper.get('[data-testid="copy-tracking"]').trigger("click")
    await flushPromises()

    expect(wrapper.text()).toContain("Select the number and copy it by hand.")
  })

  it("renders nothing with no shipment", async () => {
    const wrapper = await mountSuspended(OrderShipments, {
      props: { optionName: null, shipments: [] },
    })
    expect(wrapper.find("section").exists()).toBe(false)
  })
})
