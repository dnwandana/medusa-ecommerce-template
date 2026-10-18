<script setup lang="ts">
import type { HttpTypes } from "@medusajs/types"
import { CircleAlert, Package } from "@lucide/vue"
import type { PaymentOrder } from "~/composables/useOrders"
import type { ReviewableItem } from "~/composables/useReviews"
import type { CustomerStatus } from "~/utils/orderStatus"

definePageMeta({ middleware: "auth" })

const { t, locale } = useI18n()
const { listOrders } = useOrders()
const { listReviewableItems } = useReviews()

const orders = ref<PaymentOrder[]>([])
const reviewable = ref<ReviewableItem[]>([])
const ready = ref(false)
const failed = ref(false)

// The project has no datetimeFormats, so $d gives a US date. The store is in Jakarta, thus the
// date does not change with the time zone of the browser.
const dateFormat = computed(
  () =>
    new Intl.DateTimeFormat(locale.value === "id" ? "id-ID" : "en-GB", {
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "Asia/Jakarta",
    })
)

// The status of each order, by order id. The computed value keeps the statuses between renders.
const statuses = computed(
  () =>
    new Map<string, CustomerStatus>(orders.value.map((order) => [order.id, customerStatus(order)]))
)

// Returns the reviewable items of one order.
function reviewableFor(orderId: string): ReviewableItem[] {
  return reviewable.value.filter((item) => item.order_id === orderId)
}

// Returns the accordion items of the reviewable items of one order.
function reviewItems(orderId: string): { id: string; title: string }[] {
  return reviewableFor(orderId).map((item) => ({
    id: item.order_line_item_id,
    title: t("reviews.writeFor", { product: item.product_title }),
  }))
}

// Returns the sum of the line quantities of one order.
function itemCount(order: HttpTypes.StoreOrder): number {
  return (order.items ?? []).reduce((sum, line) => sum + line.quantity, 0)
}

// The session cookie is in the browser. Load the orders after the mount.
// The backend decides which items are reviewable. A submitted item stays in the list, so that
// its form shows the confirmation in the same position.
async function load(): Promise<void> {
  ready.value = false
  failed.value = false
  try {
    const [orderPage, items] = await Promise.all([listOrders(), listReviewableItems()])
    orders.value = orderPage.orders
    reviewable.value = items
  } catch {
    failed.value = true
  }
  ready.value = true
}

onMounted(load)

useHead({ title: () => t("account.orders") })
</script>

<template>
  <AccountNav>
    <section aria-labelledby="orders-title" class="flex flex-col gap-8">
      <div class="border-b border-border pb-4">
        <h2 id="orders-title" class="text-h3 font-normal">{{ $t("account.orders") }}</h2>
      </div>

      <div v-if="!ready" role="status" class="flex flex-col gap-8">
        <span class="sr-only">{{ $t("common.loading") }}</span>
        <div
          v-for="block in 2"
          :key="block"
          aria-hidden="true"
          class="flex flex-col gap-6 border-b border-border pb-10"
        >
          <div class="flex flex-col gap-3">
            <Skeleton class="h-6 w-1/4" />
            <Skeleton class="h-4 w-1/2" />
          </div>
          <div
            class="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-[repeat(auto-fill,minmax(240px,1fr))]"
          >
            <div
              v-for="line in 3 - block"
              :key="line"
              class="grid grid-cols-[64px_minmax(0,1fr)] items-start gap-x-4"
            >
              <Skeleton class="aspect-[4/5] w-full" />
              <div class="flex flex-col gap-2">
                <Skeleton class="h-4 w-4/5" />
                <Skeleton class="h-4 w-2/5" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <template v-else>
        <Alert v-if="failed" variant="destructive">
          <CircleAlert :stroke-width="1.5" aria-hidden="true" />
          <AlertDescription>{{ $t("account.ordersError") }}</AlertDescription>
          <AlertAction>
            <Button type="button" variant="outline" size="sm" @click="load">
              {{ $t("common.retry") }}
            </Button>
          </AlertAction>
        </Alert>

        <Empty v-else-if="orders.length === 0">
          <EmptyHeader>
            <EmptyMedia class="mb-2">
              <Package :size="28" :stroke-width="1.5" aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>{{ $t("account.noOrders") }}</EmptyTitle>
          </EmptyHeader>
          <EmptyContent>
            <Button variant="outline" as-child>
              <NuxtLinkLocale to="/products">{{ $t("cart.continue") }}</NuxtLinkLocale>
            </Button>
          </EmptyContent>
        </Empty>

        <div v-else class="flex flex-col gap-10">
          <article
            v-for="order in orders"
            :key="order.id"
            :data-testid="`order-${order.id}`"
            :aria-labelledby="`order-title-${order.id}`"
            class="flex flex-col gap-6 border-b border-border pb-10"
          >
            <div class="flex flex-wrap items-start justify-between gap-x-8 gap-y-4">
              <div>
                <div class="flex flex-wrap items-center gap-x-3 gap-y-2">
                  <h3 :id="`order-title-${order.id}`" class="text-h4">
                    {{ $t("order.number", { id: order.display_id }) }}
                  </h3>
                  <Badge variant="outline" data-testid="order-status">
                    {{ $t(`order.status.${statuses.get(order.id)}`) }}
                  </Badge>
                </div>
                <dl class="mt-2 flex flex-wrap gap-x-6 gap-y-2 md:gap-x-10">
                  <div class="flex flex-col gap-1">
                    <dt class="text-field-label text-foreground">{{ $t("account.orderDate") }}</dt>
                    <dd class="text-body-sm">
                      {{ dateFormat.format(new Date(order.created_at)) }}
                    </dd>
                  </div>
                  <div class="flex flex-col gap-1">
                    <dt class="text-field-label text-foreground">{{ $t("account.orderItems") }}</dt>
                    <dd class="text-body-sm tabular-nums">{{ itemCount(order) }}</dd>
                  </div>
                  <div class="flex flex-col gap-1">
                    <dt class="text-field-label text-foreground">{{ $t("account.orderTotal") }}</dt>
                    <dd class="text-price">{{ formatPrice(order.total) }}</dd>
                  </div>
                </dl>
              </div>
              <Button variant="outline" size="sm" class="w-full md:w-auto" as-child>
                <NuxtLinkLocale :to="`/orders/${order.id}`">{{
                  $t("account.viewOrder")
                }}</NuxtLinkLocale>
              </Button>
            </div>

            <ul
              class="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-[repeat(auto-fill,minmax(240px,1fr))]"
            >
              <li
                v-for="line in order.items ?? []"
                :key="line.id"
                class="grid grid-cols-[64px_minmax(0,1fr)] items-start gap-x-4"
              >
                <div class="aspect-[4/5] overflow-hidden bg-backdrop-sand">
                  <img
                    v-if="line.thumbnail"
                    :src="line.thumbnail"
                    alt=""
                    class="size-full object-cover"
                  />
                </div>
                <div class="flex flex-col gap-0.5 pt-0.5">
                  <p class="text-body-sm">{{ line.product_title }}</p>
                  <p v-if="line.variant_title" class="text-caption text-muted-foreground">
                    {{ line.variant_title }}
                  </p>
                  <p class="text-caption tabular-nums">× {{ line.quantity }}</p>
                </div>
              </li>
            </ul>

            <div
              v-if="reviewableFor(order.id).length"
              role="group"
              :aria-label="$t('account.reviewItems')"
            >
              <!-- A closed item keeps its form mounted, so a typed review stays. -->
              <HairlineAccordion :items="reviewItems(order.id)" :heading-level="4">
                <template
                  v-for="item in reviewableFor(order.id)"
                  :key="item.order_line_item_id"
                  #[item.order_line_item_id]
                >
                  <ReviewForm :item="item" />
                </template>
              </HairlineAccordion>
            </div>
          </article>
        </div>
      </template>
    </section>
  </AccountNav>
</template>
