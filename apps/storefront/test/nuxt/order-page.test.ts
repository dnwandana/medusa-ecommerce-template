import { mockNuxtImport, mountSuspended } from "@nuxt/test-utils/runtime"
import { flushPromises } from "@vue/test-utils"
import { beforeEach, describe, expect, it, vi } from "vitest"
import type { NuxtError } from "#app"
import {
  BankTransferInstructions,
  OrderShipments,
  OrderStatusBlock,
  OrderTracker,
  ReceiptPanel,
} from "#components"
import { clearNuxtData } from "#imports"
import OrderPage from "~/pages/orders/[id].vue"
import type { OrderTracking } from "~/composables/useOrders"
import type { CustomerStatus, OrderPaymentState } from "~/utils/orderStatus"
import { readHead } from "./helpers/head"

const { orders, bankTransfer, receipts, toast, status } = vi.hoisted(() => ({
  orders: { getOrder: vi.fn(), listOrders: vi.fn(), getTracking: vi.fn() },
  bankTransfer: { getDetails: vi.fn() },
  receipts: { uploadReceipt: vi.fn(), getPaymentStates: vi.fn() },
  toast: { success: vi.fn(), error: vi.fn() },
  // null keeps the real customerStatus, so that the payment tests use the real rules.
  status: { value: null as string | null },
}))

mockNuxtImport("useOrders", () => () => orders)
mockNuxtImport("useBankTransfer", () => () => bankTransfer)
mockNuxtImport("useReceipts", () => () => receipts)
vi.mock("vue-sonner", () => ({ toast }))
mockNuxtImport(
  "customerStatus",
  (original: (order: unknown) => CustomerStatus) => (order: unknown) =>
    (status.value as CustomerStatus | null) ?? original(order)
)

const RelatedProductsStub = {
  props: ["sourceKey", "source"],
  template: "<div data-testid='related' :data-source='JSON.stringify(source)' />",
}

const bankState = (over: Partial<OrderPaymentState> = {}): OrderPaymentState => ({
  order_id: "order_1",
  provider_id: "pp_bank-transfer_bank-transfer",
  captured_at: null,
  deadline_at: "2026-10-20T07:30:00.000Z",
  receipts: [],
  note: null,
  ...over,
})

const receipt = { id: "prcpt_1", file_name: "a.png", created_at: "2026-10-17T08:00:00Z" }

const bankOrder = {
  id: "order_1",
  status: "pending",
  display_id: 12,
  email: "buyer@example.com",
  item_subtotal: 300000,
  shipping_total: 18000,
  total: 318000,
  created_at: "2026-10-17T07:30:00Z",
  items: [],
  shipping_address: null,
  payment_collections: [{ status: "authorized" }],
  payment_state: bankState(),
}

const details = {
  bank_accounts: [
    { id: "ba_1", bank_name: "BCA", account_number: "0123456789", account_holder: "Toko" },
  ],
  contact: { email: "halo@everyday.id", whatsapp: null },
  enabled: true,
  deadline_hours: 48,
}

const shipment = {
  id: "ful_1",
  shipped_at: "2026-10-20T02:12:00.000Z",
  delivered_at: null,
  items: [{ line_item_id: "item_1", title: "Relaxed Linen Shirt", quantity: 1 }],
  labels: [{ tracking_number: "JP1234567890", tracking_url: null }],
}

const makeOrder = () => ({
  id: "order_1",
  status: "pending",
  display_id: 24117,
  email: "sari@example.com",
  item_subtotal: 758000,
  shipping_total: 18000,
  total: 776000,
  created_at: "2026-10-17T02:00:00.000Z",
  items: [
    {
      id: "item_1",
      product_id: "prod_1",
      product_title: "Relaxed Linen Shirt",
      variant_title: "Sand · Size M",
      thumbnail: null,
      quantity: 1,
      unit_price: 359000,
    },
    {
      id: "item_2",
      product_id: "prod_2",
      product_title: "Wide-Leg Chino",
      variant_title: "Navy · Size 28",
      thumbnail: null,
      quantity: 1,
      unit_price: 399000,
    },
  ],
  shipping_address: {
    first_name: "Sari",
    last_name: "Wulandari",
    address_1: "Jl. Kemang Raya No. 12",
    city: "Jakarta Selatan",
    province: "DKI Jakarta",
    postal_code: "12730",
    phone: null,
  },
  shipping_methods: [{ name: "Standard Shipping", amount: 18000 }],
  payment_collections: [{ status: "authorized" }],
  payment_state: bankState(),
})

let order = makeOrder()
const tracking: { value: OrderTracking } = { value: { cancel_reason: null, shipments: [] } }

const mountPage = async (route = "/orders/order_1") => {
  const wrapper = await mountSuspended(OrderPage, {
    route,
    global: { stubs: { RelatedProducts: RelatedProductsStub } },
  })
  await flushPromises()
  return wrapper
}

beforeEach(() => {
  clearNuxtData()
  status.value = null
  order = makeOrder()
  tracking.value = { cancel_reason: null, shipments: [] }
  orders.getOrder.mockReset()
  orders.getOrder.mockImplementation(async () => order)
  orders.getTracking.mockReset()
  orders.getTracking.mockImplementation(async () => tracking.value)
  bankTransfer.getDetails.mockReset()
  bankTransfer.getDetails.mockResolvedValue(details)
  toast.success.mockReset()
})

describe("order page", () => {
  it("shows the eyebrow and the placed heading with the first name", async () => {
    status.value = "waiting_for_payment"
    const wrapper = await mountPage()
    expect(wrapper.text()).toContain("Order #24117 · 17 October 2026")
    expect(wrapper.get("h1").text()).toBe("Thank you, Sari. Your order is placed.")
    expect(wrapper.text()).toContain(
      "We sent a confirmation to sari@example.com. We prepare your parcel when we confirm your payment."
    )
    expect(wrapper.find('[data-testid="related"]').exists()).toBe(false)
  })

  it("uses the heading with no name when the address has no first name", async () => {
    status.value = "processing"
    order.shipping_address.first_name = "  "
    const wrapper = await mountPage()
    expect(wrapper.get("h1").text()).toBe("Thank you. Your order is confirmed.")
  })

  it("shows the tracker and the shipment rows for a shipped order", async () => {
    status.value = "shipped"
    tracking.value = { cancel_reason: null, shipments: [shipment] }
    const wrapper = await mountPage()
    expect(wrapper.get("h1").text()).toBe("Your order is on its way.")
    expect(wrapper.findComponent(OrderTracker).exists()).toBe(true)
    expect(wrapper.findComponent(OrderShipments).props("optionName")).toBe("Standard Shipping")
    expect(wrapper.findComponent(OrderShipments).props("shipments")).toEqual([shipment])
    expect(wrapper.find('[data-testid="related"]').exists()).toBe(true)
    expect(orders.getTracking).toHaveBeenCalledWith("order_1")
  })

  it.each([["cancelled"], ["refunded"]])(
    "shows the status block in place of the tracker for %s",
    async (value) => {
      status.value = value
      tracking.value = { cancel_reason: "payment_timeout", shipments: [] }
      const wrapper = await mountPage()
      const block = wrapper.findComponent(OrderStatusBlock)
      expect(block.props("cancelReason")).toBe("payment_timeout")
      expect(block.props("contact")).toEqual(details.contact)
      expect(wrapper.findComponent(OrderTracker).exists()).toBe(false)
      expect(wrapper.find('[data-testid="related"]').exists()).toBe(false)
      expect(wrapper.findComponent(BankTransferInstructions).exists()).toBe(false)
      expect(wrapper.findComponent(ReceiptPanel).exists()).toBe(false)
    }
  )

  it("gives the refunded total to the status block", async () => {
    status.value = "refunded"
    Object.assign(order, { summary: { refunded_total: 776000 } })
    const wrapper = await mountPage()
    expect(wrapper.get("h1").text()).toBe("Your order is refunded.")
    expect(wrapper.findComponent(OrderStatusBlock).props("refunded")).toBe(776000)
  })

  it("still shows the status block when the store contact does not load", async () => {
    status.value = "cancelled"
    bankTransfer.getDetails.mockRejectedValue(new Error("HTTP 500"))
    const wrapper = await mountPage()
    expect(wrapper.findComponent(OrderStatusBlock).props("contact")).toBeNull()
    expect(wrapper.findComponent(OrderStatusBlock).props("deadlineHours")).toBeNull()
    expect(wrapper.get("h1").text()).toBe("Your order is cancelled.")
  })

  it("gives the deadline hours to the status block of a timeout cancel", async () => {
    status.value = "cancelled"
    tracking.value = { cancel_reason: "payment_timeout", shipments: [] }
    const wrapper = await mountPage()
    expect(wrapper.findComponent(OrderStatusBlock).props("deadlineHours")).toBe(48)
  })

  it("still shows the order when the tracking does not load", async () => {
    status.value = "processing"
    orders.getTracking.mockRejectedValue(new Error("HTTP 500"))
    const wrapper = await mountPage()
    expect(wrapper.findComponent(OrderTracker).exists()).toBe(true)
    expect(wrapper.findComponent(OrderShipments).props("shipments")).toEqual([])
  })

  it("gives the first line and all order products to the related products", async () => {
    status.value = "delivered"
    const wrapper = await mountPage()
    const source = JSON.parse(wrapper.get('[data-testid="related"]').attributes("data-source")!)
    expect(source).toEqual({ productId: "prod_1", excludeIds: ["prod_1", "prod_2"] })
  })

  it("shows the questions line with a contact link and a link to the products", async () => {
    status.value = "processing"
    order.payment_state = bankState({ captured_at: "2026-10-18T03:15:00.000Z" })
    const wrapper = await mountPage()
    const aside = wrapper.get("aside")
    expect(aside.text()).toContain("Questions about your order?")
    expect(aside.text()).toContain("Contact us, in English or Bahasa Indonesia.")
    expect(aside.get('a[href="/contact"]').text()).toBe("Contact us")
    expect(aside.get('a[href="/products"]').text()).toBe("Continue shopping")
    // A processing order needs no bank details and no store contact.
    expect(bankTransfer.getDetails).not.toHaveBeenCalled()
  })

  it("shows the bank transfer instructions for an unpaid bank transfer order", async () => {
    orders.getOrder.mockResolvedValue(bankOrder)
    bankTransfer.getDetails.mockResolvedValue(details)

    const wrapper = await mountPage()

    expect(wrapper.text()).toContain("Pay by bank transfer")
    expect(wrapper.find('[data-testid="bank-transfer-amount"]').text()).toBe("Rp 318.000")
    expect(wrapper.text()).toContain("0123456789")
    expect(wrapper.text()).toContain(
      "Transfer and upload your receipt before 20 October 2026, 14:30 WIB."
    )
    // The instructions come before the order summary, so that the customer sees them first.
    expect(wrapper.html().indexOf("Pay by bank transfer")).toBeLessThan(
      wrapper.html().indexOf('data-testid="order-details"')
    )
  })

  it("gives the deadline of the backend to the bank transfer instructions", async () => {
    orders.getOrder.mockResolvedValue(bankOrder)
    const wrapper = await mountPage()
    const instructions = wrapper.findComponent(BankTransferInstructions)
    expect(instructions.props("deadline").toISOString()).toBe("2026-10-20T07:30:00.000Z")
  })

  it("shows no instructions when the backend gives no deadline", async () => {
    orders.getOrder.mockResolvedValue({
      ...bankOrder,
      payment_state: bankState({ deadline_at: null }),
    })
    const wrapper = await mountPage()
    expect(wrapper.findComponent(BankTransferInstructions).exists()).toBe(false)
  })

  // Review Focus: a captured order must not show the bank details.
  it("shows no instructions for a captured order", async () => {
    orders.getOrder.mockResolvedValue({
      ...bankOrder,
      payment_collections: [{ status: "completed" }],
      payment_state: bankState({ captured_at: "2026-10-18T04:00:00Z" }),
    })

    const wrapper = await mountPage()

    expect(wrapper.get("h1").text()).toBe("Thank you. Your order is confirmed.")
    expect(wrapper.text()).not.toContain("Pay by bank transfer")
    expect(bankTransfer.getDetails).not.toHaveBeenCalled()
  })

  // Review Focus: a gateway order must not show the bank details.
  it("shows no instructions for a gateway order", async () => {
    orders.getOrder.mockResolvedValue({
      ...bankOrder,
      payment_state: bankState({ provider_id: "pp_gateway_gateway", deadline_at: null }),
    })

    const wrapper = await mountPage()

    expect(wrapper.get("h1").text()).toBe("Thank you. Your order is confirmed.")
    expect(wrapper.text()).not.toContain("Pay by bank transfer")
    expect(bankTransfer.getDetails).not.toHaveBeenCalled()
  })

  it("shows the contact text when the bank details do not load", async () => {
    orders.getOrder.mockResolvedValue(bankOrder)
    bankTransfer.getDetails.mockRejectedValue(new Error("down"))

    const wrapper = await mountPage()

    expect(wrapper.text()).toContain("The bank details are not available. Contact the store.")
    expect(wrapper.get("h1").text()).toBe("Thank you. Your order is placed.")
    expect(wrapper.text()).toContain("Order #12")
  })

  it("shows the bank panel and the receipt panel for an unpaid bank order", async () => {
    orders.getOrder.mockResolvedValue({ ...bankOrder, payment_state: bankState() })

    const wrapper = await mountPage()

    expect(wrapper.findComponent(BankTransferInstructions).props("phase")).toBe("none")
    expect(wrapper.findComponent(BankTransferInstructions).props("note")).toBeNull()
    const panel = wrapper.findComponent(ReceiptPanel)
    expect(panel.exists()).toBe(true)
    expect(panel.props("contact")).toEqual(details.contact)
    // Both parts come before the order summary.
    expect(wrapper.html().indexOf("Your receipt")).toBeLessThan(
      wrapper.html().indexOf('data-testid="order-details"')
    )
  })

  it("shows the checking title after a receipt", async () => {
    orders.getOrder.mockResolvedValue({
      ...bankOrder,
      payment_state: bankState({ receipts: [receipt] }),
    })

    const wrapper = await mountPage()

    expect(wrapper.text()).toContain("We are checking your payment")
    expect(wrapper.text()).toContain("a.png")
  })

  it("gives the note of the store to the bank panel", async () => {
    const note = { note: "Rp 50.000 is missing", created_at: "2026-10-17T09:00:00Z" }
    orders.getOrder.mockResolvedValue({
      ...bankOrder,
      payment_state: bankState({ receipts: [receipt], note }),
    })

    const wrapper = await mountPage()

    const panel = wrapper.findComponent(BankTransferInstructions)
    expect(panel.props("phase")).toBe("more")
    expect(panel.props("note")).toEqual(note)
    expect(wrapper.text()).toContain("Rp 50.000 is missing")
  })

  it("loads the order again after an upload", async () => {
    orders.getOrder.mockResolvedValue({ ...bankOrder, payment_state: bankState() })

    const wrapper = await mountPage()
    orders.getOrder.mockResolvedValue({
      ...bankOrder,
      payment_state: bankState({ receipts: [receipt] }),
    })
    await wrapper.findComponent(ReceiptPanel).vm.$emit("uploaded")
    await flushPromises()

    expect(orders.getOrder).toHaveBeenCalledTimes(2)
    expect(toast.success).toHaveBeenCalledWith("We got your receipt.")
    expect(wrapper.text()).toContain("We are checking your payment")
  })

  it.each([
    ["cancelled", { status: "canceled", payment_state: bankState() }],
    ["captured", { payment_state: bankState({ captured_at: "2026-10-18T04:00:00Z" }) }],
    ["gateway", { payment_state: bankState({ provider_id: "pp_x_x" }) }],
  ])("shows no payment parts for a %s order", async (_name, over) => {
    orders.getOrder.mockResolvedValue({ ...bankOrder, ...over })

    const wrapper = await mountPage()

    expect(wrapper.findComponent(BankTransferInstructions).exists()).toBe(false)
    expect(wrapper.findComponent(ReceiptPanel).exists()).toBe(false)
  })

  it("throws a 404 with the message key", async () => {
    orders.getOrder.mockResolvedValue(null)
    await mountSuspended(OrderPage, { route: "/orders/missing" })
    // mountSuspended does not reject. The fatal error goes to the Nuxt error state.
    const error = useError().value as NuxtError
    await clearError()
    expect(error.statusCode).toBe(404)
    expect(error.data).toEqual({ messageKey: "order.notFound" })
    expect(error.statusMessage ?? "").not.toContain("not")
  })

  it("tells search engines not to index the page", async () => {
    await mountPage()
    const head = await readHead()
    expect(head.meta("robots")).toBe("noindex")
    expect(head.links("canonical")).toEqual([])
  })
})
