<script setup lang="ts">
import { toast } from "vue-sonner"
import type { OrderTracking } from "~/composables/useOrders"
import type { BankTransferDetails } from "~/composables/useBankTransfer"
import type { RelatedSource } from "~/composables/useRelatedProducts"
import { refundedAmount } from "~/utils/orderNotices"
import type { CustomerStatus } from "~/utils/orderStatus"

// A guest has no account, so this page has no auth middleware. The long random order ID is the key.
const { t, locale } = useI18n()
const route = useRoute()
const { getOrder, getTracking } = useOrders()
const { getDetails } = useBankTransfer()

const { data: order, refresh } = await useAsyncData(
  () => `order:${locale.value}:${route.params.id}`,
  () => getOrder(String(route.params.id))
)

if (!order.value) {
  throw createError({ statusCode: 404, data: { messageKey: "order.notFound" }, fatal: true })
}

const status = computed<CustomerStatus>(() => customerStatus(order.value!))
const closed = computed(() => status.value === "cancelled" || status.value === "refunded")

// A captured order or a gateway order must not show the bank details.
const awaitingBankTransfer = computed(() => !!order.value && isAwaitingBankTransfer(order.value))
// The backend owns the payment deadline, so the page has no copy of the deadline rule.
const paymentDeadline = computed(() => {
  const deadlineAt = order.value?.payment_state?.deadline_at
  return deadlineAt ? new Date(deadlineAt) : null
})

const NO_TRACKING: OrderTracking = { cancel_reason: null, shipments: [] }

const [{ data: bankDetails }, { data: tracking }, { data: storeContact }] = await Promise.all([
  // The bank panel reads the accounts. The receipt panel reads the contact.
  useAsyncData(
    () => `bank-transfer:${route.params.id}`,
    async (): Promise<Pick<BankTransferDetails, "bank_accounts" | "contact"> | null> => {
      if (!awaitingBankTransfer.value) {
        return null
      }
      try {
        return await getDetails()
      } catch {
        // A failed request must not hide the order. The bank panel then shows the contact text.
        return { bank_accounts: [], contact: { email: null, whatsapp: null } }
      }
    }
  ),
  // A failed request must not hide the order. The page then shows no shipment.
  useAsyncData(
    () => `order-tracking:${route.params.id}`,
    async (): Promise<OrderTracking> => {
      try {
        return (await getTracking(String(route.params.id))) ?? NO_TRACKING
      } catch {
        return NO_TRACKING
      }
    }
  ),
  // Only the status block of a cancelled or refunded order shows the store contact.
  useAsyncData("store-contact", async (): Promise<BankTransferDetails | null> => {
    if (!closed.value) {
      return null
    }
    try {
      return await getDetails()
    } catch {
      return null
    }
  }),
])

const cancelReason = computed(() => tracking.value?.cancel_reason ?? null)
const shipments = computed(() => tracking.value?.shipments ?? [])
const optionName = computed(() => order.value?.shipping_methods?.[0]?.name ?? null)
const refunded = computed(() => (order.value ? refundedAmount(order.value) : 0))

const HEADINGS: Record<CustomerStatus, { key: string; named: boolean }> = {
  waiting_for_payment: { key: "order.heading.placed", named: true },
  payment_submitted: { key: "order.heading.placed", named: true },
  processing: { key: "order.heading.confirmed", named: true },
  shipped: { key: "order.heading.shipped", named: false },
  delivered: { key: "order.heading.delivered", named: false },
  cancelled: { key: "order.heading.cancelled", named: false },
  refunded: { key: "order.heading.refunded", named: false },
}

// A cancelled or refunded order has no body text, because the status block gives the reason.
const BODIES: Partial<Record<CustomerStatus, string>> = {
  waiting_for_payment: "order.body.waiting",
  payment_submitted: "order.body.checking",
  processing: "order.body.processing",
  shipped: "order.body.shipped",
  delivered: "order.body.delivered",
}

const heading = computed(() => {
  const { key, named } = HEADINGS[status.value]
  const name = order.value?.shipping_address?.first_name?.trim()
  if (!named) return t(key)
  return name ? t(key, { name }) : t(`${key}NoName`)
})

const body = computed(() => {
  const key = BODIES[status.value]
  return key ? t(key, { email: order.value?.email ?? "" }) : null
})

const eyebrow = computed(() =>
  t("order.eyebrow", {
    id: order.value?.display_id,
    date: order.value ? formatOrderDate(order.value.created_at, locale.value) : "",
  })
)

const steps = computed(() => (order.value ? trackerSteps(order.value, status.value) : []))

// "You may also like" shows only after the payment, and never for a cancelled order.
const RELATED_STATUSES: CustomerStatus[] = ["processing", "shipped", "delivered"]

const relatedSource = computed<RelatedSource | null>(() => {
  const productIds = (order.value?.items ?? []).flatMap((item) =>
    item.product_id ? [item.product_id] : []
  )
  return productIds[0] ? { productId: productIds[0], excludeIds: productIds } : null
})

// A new receipt changes the payment state. Thus the page loads the order again.
async function onReceiptUploaded(): Promise<void> {
  toast.success(t("receipt.uploaded"))
  await refresh()
}

// The route rules also send X-Robots-Tag: noindex. The meta tag keeps the rule in the HTML.
useSeoMeta({ robots: "noindex" })
useHead({ title: () => t("order.number", { id: order.value?.display_id }) })
</script>

<template>
  <div v-if="order" class="flex flex-col pt-8 md:pt-24">
    <div class="grid items-start gap-y-12 lg:grid-cols-[minmax(0,7fr)_minmax(0,4fr)] lg:gap-x-24">
      <div class="flex min-w-0 flex-col gap-12 md:gap-16">
        <header class="flex max-w-[640px] flex-col gap-4">
          <p class="text-eyebrow text-muted-foreground">{{ eyebrow }}</p>
          <h1 class="text-h1">{{ heading }}</h1>
          <p v-if="body" class="text-body-lg text-muted-foreground">{{ body }}</p>
        </header>

        <template v-if="awaitingBankTransfer && order.payment_state && !closed">
          <BankTransferInstructions
            v-if="paymentDeadline"
            :amount="order.total"
            :deadline="paymentDeadline"
            :accounts="bankDetails?.bank_accounts ?? []"
            :phase="receiptPhase(order.payment_state)"
            :note="order.payment_state.note"
          />
          <ReceiptPanel
            :order-id="order.id"
            :state="order.payment_state"
            :contact="bankDetails?.contact ?? null"
            @uploaded="onReceiptUploaded"
          />
        </template>

        <OrderStatusBlock
          v-if="status === 'cancelled' || status === 'refunded'"
          :status="status"
          :cancel-reason="cancelReason"
          :refunded="refunded"
          :contact="storeContact?.contact ?? null"
          :deadline-hours="storeContact?.deadline_hours ?? null"
        />
        <OrderTracker v-else :steps="steps" />

        <OrderShipments :shipments="shipments" :option-name="optionName" />

        <OrderSummary :order="order" :status="status" :cancel-reason="cancelReason" />
      </div>

      <aside class="flex flex-col gap-8 lg:sticky lg:top-24">
        <Button variant="outline" size="lg" class="w-full" as-child>
          <NuxtLinkLocale to="/products">{{ $t("cart.continue") }}</NuxtLinkLocale>
        </Button>
        <p class="text-caption text-muted-foreground">
          {{ $t("order.questions") }}
          <i18n-t keypath="order.contactLine" tag="span" scope="global">
            <template #link>
              <NuxtLinkLocale
                to="/contact"
                class="underline underline-offset-4 hover:text-foreground"
                >{{ $t("order.contactLink") }}</NuxtLinkLocale
              >
            </template>
          </i18n-t>
        </p>
      </aside>
    </div>

    <RelatedProducts
      v-if="RELATED_STATUSES.includes(status)"
      :source-key="`order:${order.id}`"
      :source="relatedSource"
      class="pt-16 md:pt-32"
    />
  </div>
</template>
