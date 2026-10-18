<script setup lang="ts">
import { ImageOff } from "@lucide/vue"
import type { PaymentOrder } from "~/composables/useOrders"
import { refundedAmount } from "~/utils/orderNotices"
import type { CustomerStatus } from "~/utils/orderStatus"
import { paymentRowKeys } from "~/utils/paymentRows"

const props = defineProps<{
  order: PaymentOrder
  status: CustomerStatus
  cancelReason: string | null
}>()

const { te } = useI18n()

// The store has the payment of these statuses.
const PAID_STATUSES: CustomerStatus[] = ["processing", "shipped", "delivered"]

const paid = computed(() => PAID_STATUSES.includes(props.status))
const refunded = computed(() => refundedAmount(props.order))
const address = computed(() => props.order.shipping_address ?? null)
const fullName = computed(() =>
  [address.value?.first_name, address.value?.last_name]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(" ")
)
const optionName = computed(() => props.order.shipping_methods?.[0]?.name ?? null)

// The order fields have no payment sessions. The payment state gives the provider of the order.
const paymentTitleKey = computed(() => {
  const providerId = props.order.payment_state?.provider_id
  return providerId ? paymentRowKeys(providerId, (key) => te(key)).title : null
})

const paymentStateKey = computed(() => {
  switch (props.status) {
    case "waiting_for_payment":
      return "order.paymentState.awaiting"
    case "payment_submitted":
      return "order.tracker.checkingReceipt"
    case "cancelled":
      return props.cancelReason === "payment_timeout"
        ? "order.paymentState.notReceived"
        : "order.paymentState.cancelled"
    case "refunded":
      return "order.refunded"
    default:
      return "order.paymentState.received"
  }
})
</script>

<template>
  <div class="flex flex-col gap-12 md:gap-16">
    <div
      data-testid="order-details"
      class="grid gap-x-12 gap-y-8 border-t border-border pt-8 md:grid-cols-2 md:gap-y-6 md:pt-10"
    >
      <div v-if="address" class="flex flex-col gap-2 md:row-span-2">
        <p class="text-field-label text-muted-foreground">{{ $t("order.details.deliveringTo") }}</p>
        <p class="text-body">
          <span v-if="fullName" class="block">{{ fullName }}</span>
          <span v-if="address.address_1" class="block">{{ address.address_1 }}</span>
          <span class="block">
            {{ [address.city, address.province].filter(Boolean).join(", ") }}
            {{ address.postal_code }}
          </span>
          <span v-if="address.phone" class="block text-muted-foreground">{{ address.phone }}</span>
        </p>
      </div>
      <div v-if="optionName" class="flex flex-col gap-2">
        <p class="text-field-label text-muted-foreground">{{ $t("order.details.delivery") }}</p>
        <p class="text-body">{{ optionName }}</p>
      </div>
      <div class="flex flex-col gap-2">
        <p class="text-field-label text-muted-foreground">{{ $t("order.details.payment") }}</p>
        <p class="text-body">
          <span v-if="paymentTitleKey" class="block">{{ $t(paymentTitleKey) }}</span>
          <span class="block text-muted-foreground">{{ $t(paymentStateKey) }}</span>
        </p>
      </div>
    </div>

    <section>
      <h2 class="sr-only">{{ $t("order.itemsTitle", { id: order.display_id }) }}</h2>
      <ul class="border-t border-border">
        <li
          v-for="item in order.items ?? []"
          :key="item.id"
          class="grid grid-cols-[72px_minmax(0,1fr)_auto] items-start gap-x-4 border-b border-border py-5 md:grid-cols-[96px_minmax(0,1fr)_auto] md:gap-x-6 md:py-6"
        >
          <div
            class="flex aspect-[4/5] items-center justify-center overflow-hidden bg-backdrop-sand"
          >
            <img
              v-if="item.thumbnail"
              :src="item.thumbnail"
              :alt="item.product_title ?? ''"
              class="size-full object-cover"
            />
            <ImageOff v-else class="size-6 text-icon-subtle" aria-hidden="true" />
          </div>
          <div class="flex min-w-0 flex-col gap-1">
            <p class="text-body">{{ item.product_title }}</p>
            <p class="text-caption text-muted-foreground">
              {{
                [item.variant_title, $t("order.quantity", { quantity: item.quantity })]
                  .filter(Boolean)
                  .join(" · ")
              }}
            </p>
          </div>
          <p class="text-right text-price">{{ formatPrice(item.unit_price * item.quantity) }}</p>
        </li>
      </ul>

      <dl class="ml-auto flex w-full flex-col gap-2.5 pt-6 md:max-w-[360px]">
        <div class="flex items-baseline justify-between gap-4">
          <dt class="text-body-sm">{{ $t("cart.subtotal") }}</dt>
          <dd class="text-price" data-testid="order-subtotal">
            {{ formatPrice(order.item_subtotal) }}
          </dd>
        </div>
        <div class="flex items-baseline justify-between gap-4">
          <dt class="text-body-sm">{{ $t("order.details.delivery") }}</dt>
          <dd class="text-price" data-testid="order-shipping">
            {{ formatDeliveryPrice(order.shipping_total, $t("order.free")) }}
          </dd>
        </div>
        <div
          class="flex items-baseline justify-between gap-4 border-t border-border pt-2.5"
          data-testid="order-total"
        >
          <dt class="text-field-label">{{ paid ? $t("order.totalPaid") : $t("cart.total") }}</dt>
          <dd class="text-price-lg">{{ formatPrice(order.total) }}</dd>
        </div>
        <div
          v-if="refunded > 0"
          class="flex items-baseline justify-between gap-4"
          data-testid="order-refunded"
        >
          <dt class="text-body-sm">{{ $t("order.refunded") }}</dt>
          <dd class="text-price">−{{ formatPrice(refunded) }}</dd>
        </div>
      </dl>
      <!-- A refunded order shows this text in the status block. -->
      <p v-if="paid && refunded > 0" class="ml-auto pt-4 text-body-sm md:max-w-[360px]">
        {{ $t("order.refundedAmount", { amount: formatPrice(refunded) }) }}
      </p>
    </section>
  </div>
</template>
