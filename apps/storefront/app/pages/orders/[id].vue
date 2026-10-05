<script setup lang="ts">
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
  <div v-if="order" class="flex flex-col gap-6">
    <div class="flex flex-col gap-2">
      <h1 class="text-2xl font-semibold">{{ $t("order.thanks") }}</h1>
      <p>{{ $t("order.confirmationSent", { email: order.email }) }}</p>
    </div>

    <OrderSummary :order="order" />

    <div>
      <Button as-child>
        <NuxtLinkLocale to="/products">{{ $t("cart.continue") }}</NuxtLinkLocale>
      </Button>
    </div>
  </div>
</template>
