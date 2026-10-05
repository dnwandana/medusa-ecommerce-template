<script setup lang="ts">
import type { HttpTypes } from "@medusajs/types"
import type { ReviewableItem } from "~/composables/useReviews"

definePageMeta({ middleware: "auth" })

const { t } = useI18n()
const { listOrders } = useOrders()
const { listReviewableItems } = useReviews()

const orders = ref<HttpTypes.StoreOrder[]>([])
const reviewable = ref<ReviewableItem[]>([])
const ready = ref(false)
const failed = ref(false)

// Returns the reviewable items of one order.
function reviewableFor(orderId: string): ReviewableItem[] {
  return reviewable.value.filter((item) => item.order_id === orderId)
}

// The session cookie is in the browser. Load the orders after the mount.
// The backend decides which items are reviewable. A submitted item stays in the list, so that
// its form shows the confirmation in the same position.
onMounted(async () => {
  try {
    const [orderPage, items] = await Promise.all([listOrders(), listReviewableItems()])
    orders.value = orderPage.orders
    reviewable.value = items
  } catch {
    failed.value = true
  }
  ready.value = true
})

useHead({ title: () => t("account.orders") })
</script>

<template>
  <div class="flex flex-col gap-6">
    <h1 class="text-2xl font-semibold">{{ $t("account.orders") }}</h1>

    <p v-if="!ready">{{ $t("common.loading") }}</p>
    <template v-else>
      <p v-if="failed" role="alert" class="text-destructive">{{ $t("common.error") }}</p>
      <p v-else-if="orders.length === 0">{{ $t("account.noOrders") }}</p>

      <Card
        v-for="order in orders"
        :key="order.id"
        :data-testid="`order-${order.id}`"
        class="flex flex-col gap-4 px-4"
      >
        <div class="flex flex-wrap items-center gap-4">
          <span class="font-semibold">{{ $t("order.number", { id: order.display_id }) }}</span>
          <span class="text-muted-foreground">{{ $d(new Date(order.created_at)) }}</span>
          <span>{{ formatPrice(order.total) }}</span>
          <NuxtLinkLocale :to="`/orders/${order.id}`" class="ml-auto underline underline-offset-4">
            {{ $t("account.viewOrder") }}
          </NuxtLinkLocale>
        </div>

        <ReviewForm
          v-for="item in reviewableFor(order.id)"
          :key="item.order_line_item_id"
          :item="item"
        />
      </Card>
    </template>
  </div>
</template>
