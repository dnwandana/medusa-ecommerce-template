import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import { ReceiptUploadForm } from "#components"

const { receipts } = vi.hoisted(() => ({
  receipts: { uploadReceipt: vi.fn(), getPaymentStates: vi.fn() },
}))

mockNuxtImport("useReceipts", () => () => receipts)

const uploadReceipt = receipts.uploadReceipt

type Form = Awaited<ReturnType<typeof mountSuspended>>

// happy-dom cannot set the files of an input. The test defines them, then sends the change event.
async function choose(wrapper: Form, file: File): Promise<void> {
  const input = wrapper.get('input[type="file"]')
  Object.defineProperty(input.element, "files", { value: [file], configurable: true })
  await input.trigger("change")
}

const png = (size = 10, name = "a.png") =>
  new File([new Uint8Array(size)], name, { type: "image/png" })

beforeEach(() => {
  uploadReceipt.mockReset()
})

describe("ReceiptUploadForm", () => {
  it("shows the drop zone, the choose button and the formats", async () => {
    const wrapper = await mountSuspended(ReceiptUploadForm, { props: { orderId: "order_1" } })

    const input = wrapper.get('input[type="file"]')
    expect(input.attributes("accept")).toBe("image/jpeg,image/png,image/webp")
    expect(wrapper.text()).toContain("Drop the file here, or")
    expect(wrapper.text()).toContain("Choose a file")
    expect(wrapper.text()).toContain("JPG, PNG or WebP, up to 5 MB")
    // The choose button is the visible label of the input.
    expect(wrapper.get(`label[for="${input.attributes("id")}"]`).text()).toBe("Choose a file")
  })

  it("refuses a PDF and a file larger than 5 MB", async () => {
    const wrapper = await mountSuspended(ReceiptUploadForm, { props: { orderId: "order_1" } })

    await choose(wrapper, new File(["%PDF"], "a.pdf", { type: "application/pdf" }))
    expect(wrapper.get('[role="alert"]').text()).toBe(
      "This file type is not supported. Choose a JPG, PNG or WebP file."
    )

    await choose(wrapper, png(5 * 1024 * 1024 + 1, "big.png"))
    expect(wrapper.get('[role="alert"]').text()).toBe(
      "The file is larger than 5 MB. Choose a smaller file."
    )
    expect(wrapper.find("button[type=submit]").exists()).toBe(false)
  })

  it("checks a dropped file", async () => {
    const wrapper = await mountSuspended(ReceiptUploadForm, { props: { orderId: "order_1" } })

    await wrapper.get('[data-testid="receipt-drop"]').trigger("drop", {
      dataTransfer: { files: [new File(["%PDF"], "a.pdf", { type: "application/pdf" })] },
    })
    expect(wrapper.get('[role="alert"]').text()).toBe(
      "This file type is not supported. Choose a JPG, PNG or WebP file."
    )

    await wrapper.get('[data-testid="receipt-drop"]').trigger("drop", {
      dataTransfer: { files: [png(2048, "drop.png")] },
    })
    expect(wrapper.text()).toContain("drop.png")
    expect(wrapper.text()).toContain("2 KB")
  })

  it("uploads the selected file and emits the receipt", async () => {
    uploadReceipt.mockResolvedValue({
      id: "prcpt_1",
      file_name: "a.png",
      created_at: "2026-10-18T02:00:00Z",
    })
    const wrapper = await mountSuspended(ReceiptUploadForm, { props: { orderId: "order_1" } })

    await choose(wrapper, png())
    expect(wrapper.text()).toContain("a.png")
    expect(wrapper.get("button[type=submit]").text()).toBe("Upload receipt")

    await wrapper.get("form").trigger("submit")
    await flushPromises()

    expect(uploadReceipt).toHaveBeenCalledWith("order_1", expect.any(File))
    expect(wrapper.emitted("uploaded")?.[0]).toEqual([
      { id: "prcpt_1", file_name: "a.png", created_at: "2026-10-18T02:00:00Z" },
    ])
    // After the upload, the form goes back to the drop zone.
    expect(wrapper.find("button[type=submit]").exists()).toBe(false)
    expect(wrapper.text()).toContain("Choose a file")
  })

  it("shows the loading button while the upload runs", async () => {
    uploadReceipt.mockReturnValue(new Promise(() => {}))
    const wrapper = await mountSuspended(ReceiptUploadForm, { props: { orderId: "order_1" } })

    await choose(wrapper, png())
    await wrapper.get("form").trigger("submit")

    const button = wrapper.get("button[type=submit]")
    expect(button.attributes("aria-busy")).toBe("true")
    expect(button.text()).toContain("Uploading…")
  })

  it("keeps the file after a failed upload", async () => {
    uploadReceipt.mockRejectedValue(Object.assign(new Error("x"), { status: 500 }))
    const wrapper = await mountSuspended(ReceiptUploadForm, { props: { orderId: "order_1" } })

    await choose(wrapper, png())
    await wrapper.get("form").trigger("submit")
    await flushPromises()

    expect(wrapper.text()).toContain("The upload failed. Try again.")
    expect(wrapper.text()).toContain("a.png")
    expect(wrapper.text()).not.toContain("500")
    expect(wrapper.emitted("uploaded")).toBeUndefined()
  })

  it("never uploads a file that fails the check", async () => {
    const wrapper = await mountSuspended(ReceiptUploadForm, { props: { orderId: "order_1" } })

    await choose(wrapper, new File(["%PDF"], "a.pdf", { type: "application/pdf" }))
    await wrapper.get("form").trigger("submit")
    await flushPromises()

    expect(uploadReceipt).not.toHaveBeenCalled()
  })
})
