<script setup lang="ts">
type ReturnState = "confirming" | "noCart" | "pending" | "failed"

const { t, locale, locales, defaultLocale } = useI18n()
const localePath = useLocalePath()
const cartId = useCartId()
const { clear } = useCart()
const checkout = useCheckout()
const savedLocale = useCookie("i18n_redirected")

const state = ref<ReturnState>("confirming")

const wait = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

// Completes the cart and shows the result.
async function confirm(): Promise<void> {
  // Mayar returns to a URL with no locale prefix. The cookie keeps the locale of the customer.
  // resolveReturnLocale returns one of the given codes, so the cast is safe.
  const target = resolveReturnLocale(
    savedLocale.value,
    locales.value.map((item) => item.code),
    defaultLocale
  ) as typeof locale.value
  if (target !== locale.value) {
    // The page mounts again in the target locale and completes the cart there.
    await navigateTo(localePath("/checkout/return", target), { replace: true })
    return
  }

  if (!cartId.value) {
    state.value = "noCart"
    return
  }

  const result = await completeCartWithRetry({ complete: () => checkout.complete(), wait })
  if (result.status === "order") {
    clear()
    await navigateTo(localePath(`/orders/${result.order.id}`), { replace: true })
    return
  }

  // Keep the cart. The webhook can still complete it, and the customer can try again.
  state.value = result.status
}

onMounted(confirm)

useHead({ title: () => t(state.value === "pending" ? "return.pendingTitle" : "checkout.title") })
</script>

<template>
  <section class="mx-auto max-w-xl space-y-4 py-12 text-center">
    <p v-if="state === 'confirming'" role="status">{{ $t("return.confirming") }}</p>

    <template v-else-if="state === 'noCart'">
      <p>{{ $t("return.noCart") }}</p>
      <NuxtLinkLocale to="/" class="underline">{{ $t("return.toHome") }}</NuxtLinkLocale>
    </template>

    <template v-else-if="state === 'pending'">
      <h1 class="text-2xl font-semibold">{{ $t("return.pendingTitle") }}</h1>
      <p>{{ $t("return.pendingBody") }}</p>
      <NuxtLinkLocale to="/cart" class="underline">{{ $t("return.toCart") }}</NuxtLinkLocale>
    </template>

    <template v-else>
      <div role="alert">
        <h1 class="text-2xl font-semibold">{{ $t("return.failedTitle") }}</h1>
      </div>
      <p>{{ $t("return.failedBody") }}</p>
      <NuxtLinkLocale to="/" class="underline">{{ $t("return.toHome") }}</NuxtLinkLocale>
    </template>
  </section>
</template>
