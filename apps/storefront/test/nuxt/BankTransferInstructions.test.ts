import { mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { afterEach, describe, expect, it, vi } from "vitest"
import { BankTransferInstructions } from "#components"
import { formatPrice } from "~/utils/formatPrice"

const accounts = [
  { id: "ba_1", bank_name: "BCA", account_number: "0123456789", account_holder: "Toko Sari" },
  { id: "ba_2", bank_name: "BRI", account_number: "9876543210", account_holder: "Toko Sari" },
]
const props = {
  amount: 318000,
  deadline: new Date("2026-10-18T07:30:00Z"),
  accounts,
  phase: "none" as const,
  note: null,
}

afterEach(() => {
  vi.unstubAllGlobals()
})

describe("BankTransferInstructions", () => {
  it("shows the amount, each account, and the deadline in WIB", async () => {
    const wrapper = await mountSuspended(BankTransferInstructions, { props })

    expect(wrapper.text()).toContain("Pay by bank transfer")
    expect(wrapper.text()).toContain(formatPrice(318000))
    expect(wrapper.text()).toContain("BCA")
    expect(wrapper.text()).toContain("0123456789")
    expect(wrapper.text()).toContain("BRI")
    expect(wrapper.text()).toContain("9876543210")
    expect(wrapper.text()).toContain("Toko Sari")
    expect(wrapper.text()).toContain(
      "Transfer and upload your receipt before 18 October 2026, 14:30 WIB."
    )
  })

  it("shows the deadline and the warning before the first receipt", async () => {
    const wrapper = await mountSuspended(BankTransferInstructions, { props })

    expect(wrapper.get("h2").text()).toBe("Pay by bank transfer")
    expect(wrapper.text()).toContain(
      "Transfer and upload your receipt before 18 October 2026, 14:30 WIB."
    )
    expect(wrapper.text()).toContain("If we get no receipt by then, we cancel the order.")
  })

  it("hides the accounts and the deadline after a receipt", async () => {
    const wrapper = await mountSuspended(BankTransferInstructions, {
      props: { ...props, phase: "submitted" },
    })

    expect(wrapper.get("h2").text()).toBe("We are checking your payment")
    expect(wrapper.find('[data-testid="bank-transfer-amount"]').text()).toBe(formatPrice(318000))
    expect(wrapper.find('[data-testid="copy-account"]').exists()).toBe(false)
    expect(wrapper.text()).not.toContain("Transfer and upload")
    expect(wrapper.text()).not.toContain("we cancel the order")
  })

  it("shows the note and the accounts again for more payment", async () => {
    const wrapper = await mountSuspended(BankTransferInstructions, {
      props: {
        ...props,
        phase: "more",
        note: { note: "Rp 50.000 is missing", created_at: "2026-10-18T03:00:00Z" },
      },
    })

    expect(wrapper.get("h2").text()).toBe("Pay by bank transfer")
    expect(wrapper.text()).toContain("A note from the store")
    expect(wrapper.text()).toContain("Rp 50.000 is missing")
    expect(wrapper.text()).toContain("Transfer the difference, then upload one more receipt.")
    expect(wrapper.find('[data-testid="copy-account"]').exists()).toBe(true)
    expect(wrapper.text()).not.toContain("Transfer and upload")
  })

  it("shows the note as text with its line breaks", async () => {
    const wrapper = await mountSuspended(BankTransferInstructions, {
      props: {
        ...props,
        phase: "more",
        note: { note: "<b>Line one</b>\nLine two", created_at: "2026-10-18T03:00:00Z" },
      },
    })

    const note = wrapper.get('[data-testid="store-note"]')
    expect(note.text()).toContain("<b>Line one</b>")
    expect(note.find("b").exists()).toBe(false)
    expect(note.classes()).toContain("whitespace-pre-line")
  })

  it("gives each copy button a label with the bank name", async () => {
    const wrapper = await mountSuspended(BankTransferInstructions, { props })

    const buttons = wrapper.findAll('[data-testid="copy-account"]')
    expect(buttons).toHaveLength(2)
    expect(buttons[0]!.attributes("aria-label")).toContain("BCA")
    expect(buttons[1]!.attributes("aria-label")).toContain("BRI")
  })

  it("copies the account number and shows Copied", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined)
    vi.stubGlobal("navigator", { clipboard: { writeText } })
    const wrapper = await mountSuspended(BankTransferInstructions, { props })

    await wrapper.findAll('[data-testid="copy-account"]')[1]!.trigger("click")
    await flushPromises()

    expect(writeText).toHaveBeenCalledWith("9876543210")
    const buttons = wrapper.findAll('[data-testid="copy-account"]')
    // The Copied text stays on the button that the customer clicked.
    expect(buttons[1]!.text()).toContain("Copied")
    expect(buttons[0]!.text()).not.toContain("Copied")
  })

  it("shows the hand-copy text when the clipboard fails", async () => {
    vi.stubGlobal("navigator", {
      clipboard: { writeText: vi.fn().mockRejectedValue(new Error("denied")) },
    })
    const wrapper = await mountSuspended(BankTransferInstructions, { props })

    await wrapper.findAll('[data-testid="copy-account"]')[0]!.trigger("click")
    await flushPromises()

    expect(wrapper.text()).toContain("Select the number and copy it by hand.")
    expect(wrapper.text()).not.toContain("Copied")
  })

  it("shows the hand-copy text when the browser has no clipboard", async () => {
    vi.stubGlobal("navigator", {})
    const wrapper = await mountSuspended(BankTransferInstructions, { props })

    await wrapper.findAll('[data-testid="copy-account"]')[0]!.trigger("click")
    await flushPromises()

    expect(wrapper.text()).toContain("Select the number and copy it by hand.")
  })

  it("shows the contact text when there is no active account", async () => {
    const wrapper = await mountSuspended(BankTransferInstructions, {
      props: { ...props, accounts: [] },
    })

    expect(wrapper.text()).toContain("The bank details are not available. Contact the store.")
    expect(wrapper.find('[data-testid="copy-account"]').exists()).toBe(false)
  })
})
