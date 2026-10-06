<script setup lang="ts">
import type { HttpTypes } from "@medusajs/types"
import { ChevronDown, Package } from "@lucide/vue"
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
  <AccountNav>
    <section class="flex flex-col gap-6">
      <h2 class="text-h2">{{ $t("account.orders") }}</h2>

      <p v-if="!ready" role="status" class="text-muted-foreground">{{ $t("common.loading") }}</p>
      <template v-else>
        <Alert v-if="failed" variant="destructive">
          <AlertDescription>{{ $t("common.error") }}</AlertDescription>
        </Alert>

        <Empty v-else-if="orders.length === 0" variant="outline">
          <EmptyHeader>
            <EmptyMedia>
              <Package class="size-6" aria-hidden="true" />
            </EmptyMedia>
            <EmptyTitle>{{ $t("account.noOrders") }}</EmptyTitle>
          </EmptyHeader>
          <EmptyContent>
            <Button as-child>
              <NuxtLinkLocale to="/products">{{ $t("cart.continue") }}</NuxtLinkLocale>
            </Button>
          </EmptyContent>
        </Empty>

        <Card v-for="order in orders" :key="order.id" :data-testid="`order-${order.id}`">
          <CardHeader class="flex flex-row flex-wrap items-center gap-x-4 gap-y-1">
            <h3 class="text-h4">{{ $t("order.number", { id: order.display_id }) }}</h3>
            <span class="text-body-sm text-muted-foreground">{{ $d(new Date(order.created_at)) }}</span>
            <span class="text-body-sm text-muted-foreground">
              {{ $t("order.items") }}: {{ (order.items ?? []).reduce((sum, line) => sum + line.quantity, 0) }}
            </span>
            <span class="text-price">{{ formatPrice(order.total) }}</span>
            <Button variant="outline" size="sm" class="ml-auto" as-child>
              <NuxtLinkLocale :to="`/orders/${order.id}`">{{ $t("account.viewOrder") }}</NuxtLinkLocale>
            </Button>
          </CardHeader>

          <CardContent class="flex flex-col gap-3">
            <Item v-for="line in order.items ?? []" :key="line.id" class="py-1">
              <ItemMedia class="aspect-[3/4] w-14 overflow-hidden rounded-sm bg-backdrop-sand">
                <img
                  v-if="line.thumbnail"
                  :src="line.thumbnail"
                  :alt="line.product_title ?? ''"
                  class="size-full object-cover"
                />
              </ItemMedia>
              <ItemContent>
                <ItemTitle>{{ line.product_title }}</ItemTitle>
                <ItemDescription v-if="line.variant_title">{{ line.variant_title }}</ItemDescription>
                <span class="text-body-sm">× {{ line.quantity }}</span>
              </ItemContent>
            </Item>

            <!-- A closed Collapsible keeps its form mounted, so a typed review stays. -->
            <Collapsible
              v-for="item in reviewableFor(order.id)"
              :key="item.order_line_item_id"
              :unmount-on-hide="false"
              class="rounded-lg border border-border bg-card"
            >
              <CollapsibleTrigger
                class="group flex min-h-13 w-full items-center gap-2.5 rounded-lg px-4 py-3 text-left text-body-sm font-semibold outline-none focus-visible:shadow-focus"
              >
                {{ $t("reviews.writeFor", { product: item.product_title }) }}
                <ChevronDown
                  class="ml-auto size-4 shrink-0 transition-transform group-data-[state=open]:rotate-180"
                  aria-hidden="true"
                />
              </CollapsibleTrigger>
              <CollapsibleContent class="px-4 pb-5">
                <ReviewForm :item="item" />
              </CollapsibleContent>
            </Collapsible>
          </CardContent>
        </Card>
      </template>
    </section>
  </AccountNav>
</template>
