<script setup lang="ts">
import { CircleCheck } from "@lucide/vue"

// A guest has no account, so this page has no auth middleware. The long random order ID is the key.
const { t, locale } = useI18n()
const route = useRoute()
const { getOrder } = useOrders()

const { data: order } = await useAsyncData(
  () => `order:${locale.value}:${route.params.id}`,
  () => getOrder(String(route.params.id))
)

if (!order.value) {
  throw createError({ statusCode: 404, statusMessage: t("order.notFound"), fatal: true })
}

useHead({ title: () => t("order.thanks") })
</script>

<template>
  <div v-if="order" class="flex flex-col gap-8">
    <div class="flex flex-col items-center gap-3 text-center">
      <div
        class="flex size-14 items-center justify-center rounded-full bg-success-soft text-success"
      >
        <CircleCheck aria-hidden="true" class="size-7" />
      </div>
      <h1 class="text-h1">{{ $t("order.thanks") }}</h1>
      <p class="text-body-lg text-muted-foreground">
        {{ $t("order.confirmationSent", { email: order.email }) }}
      </p>
    </div>

    <OrderSummary :order="order" />

    <div>
      <Button variant="outline" size="lg" as-child>
        <NuxtLinkLocale to="/products">{{ $t("cart.continue") }}</NuxtLinkLocale>
      </Button>
    </div>
  </div>
</template>
