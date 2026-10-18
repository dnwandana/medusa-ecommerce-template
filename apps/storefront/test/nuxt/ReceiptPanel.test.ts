import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime"
import { describe, expect, it, vi } from "vitest"
import { ReceiptPanel, ReceiptUploadForm } from "#components"

const { receipts } = vi.hoisted(() => ({
  receipts: { uploadReceipt: vi.fn(), getPaymentStates: vi.fn() },
}))

mockNuxtImport("useReceipts", () => () => receipts)

const state = (n: number) => ({
  order_id: "order_1",
  provider_id: "pp_bank-transfer_bank-transfer",
  captured_at: null,
  note: null,
  receipts: Array.from({ length: n }, (_, i) => ({
    id: `prcpt_${i}`,
    file_name: `r${i}.png`,
    created_at: "2026-10-17T07:30:00Z",
  })),
})
const contact = { email: "halo@everyday.id", whatsapp: "+6281234567890" }

describe("ReceiptPanel", () => {
  it("asks for the first receipt", async () => {
    const wrapper = await mountSuspended(ReceiptPanel, {
      props: { orderId: "order_1", state: state(0), contact },
    })

    expect(wrapper.get("h3").text()).toBe("Your receipt")
    expect(wrapper.text()).toContain("You can upload up to 3 receipts.")
    expect(wrapper.find("h4").exists()).toBe(false)
    expect(wrapper.findComponent(ReceiptUploadForm).exists()).toBe(true)
  })

  it("lists the receipts and counts the rest", async () => {
    const wrapper = await mountSuspended(ReceiptPanel, {
      props: { orderId: "order_1", state: state(1), contact },
    })

    expect(wrapper.text()).toContain("You can upload 2 more receipts.")
    expect(wrapper.get("h4").text()).toBe("Uploaded receipts")
    expect(wrapper.text()).toContain("r0.png")
    expect(wrapper.text()).toContain("Uploaded 17 October 2026, 14:30 WIB")
  })

  it("uses the singular for one more receipt", async () => {
    const wrapper = await mountSuspended(ReceiptPanel, {
      props: { orderId: "order_1", state: state(2), contact },
    })

    expect(wrapper.text()).toContain("You can upload 1 more receipt.")
  })

  it("lists the oldest receipt first", async () => {
    const unsorted = {
      ...state(0),
      receipts: [
        { id: "prcpt_b", file_name: "second.png", created_at: "2026-10-17T09:00:00Z" },
        { id: "prcpt_a", file_name: "first.png", created_at: "2026-10-17T08:00:00Z" },
      ],
    }
    const wrapper = await mountSuspended(ReceiptPanel, {
      props: { orderId: "order_1", state: unsorted, contact },
    })

    const rows = wrapper.findAll('[data-testid="receipt-row"]')
    expect(rows.map((row) => row.text())).toEqual([
      expect.stringContaining("first.png"),
      expect.stringContaining("second.png"),
    ])
  })

  it("shows the file name as text and no image", async () => {
    const unsafe = {
      ...state(0),
      receipts: [
        { id: "prcpt_x", file_name: "<img src=x>.png", created_at: "2026-10-17T08:00:00Z" },
      ],
    }
    const wrapper = await mountSuspended(ReceiptPanel, {
      props: { orderId: "order_1", state: unsafe, contact },
    })

    expect(wrapper.text()).toContain("<img src=x>.png")
    expect(wrapper.find("img").exists()).toBe(false)
  })

  it("shows the contact and no form at 3 receipts", async () => {
    const wrapper = await mountSuspended(ReceiptPanel, {
      props: { orderId: "order_1", state: state(3), contact },
    })

    expect(wrapper.text()).toContain("You uploaded 3 receipts.")
    expect(wrapper.text()).toContain(
      "You cannot upload more receipts. To send another receipt, contact the store."
    )
    expect(wrapper.find('a[href="mailto:halo@everyday.id"]').exists()).toBe(true)
    expect(wrapper.find('a[href^="https://wa.me/"]').exists()).toBe(true)
    expect(wrapper.findComponent(ReceiptUploadForm).exists()).toBe(false)
  })

  it("shows only the text at 3 receipts when the store has no contact", async () => {
    const wrapper = await mountSuspended(ReceiptPanel, {
      props: { orderId: "order_1", state: state(3), contact: { email: null, whatsapp: null } },
    })

    expect(wrapper.text()).toContain("You cannot upload more receipts.")
    expect(wrapper.find("a").exists()).toBe(false)
  })

  it("sends the uploaded event up", async () => {
    const wrapper = await mountSuspended(ReceiptPanel, {
      props: { orderId: "order_1", state: state(0), contact },
    })

    const receipt = { id: "prcpt_1", file_name: "a.png", created_at: "2026-10-18T02:00:00Z" }
    await wrapper.findComponent(ReceiptUploadForm).vm.$emit("uploaded", receipt)

    expect(wrapper.emitted("uploaded")).toHaveLength(1)
  })
})
