<script setup lang="ts">
import { CircleAlert, Clock, ShoppingBag } from "@lucide/vue"

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
  <Empty class="mx-auto max-w-xl">
    <EmptyHeader v-if="state === 'confirming'">
      <EmptyMedia tone="muted">
        <Spinner class="size-6" />
      </EmptyMedia>
      <EmptyTitle role="status"
        ><h1>{{ $t("return.confirming") }}</h1></EmptyTitle
      >
    </EmptyHeader>

    <template v-else-if="state === 'noCart'">
      <EmptyHeader>
        <EmptyMedia tone="muted">
          <ShoppingBag aria-hidden="true" class="size-6" />
        </EmptyMedia>
        <EmptyTitle
          ><h1>{{ $t("return.noCart") }}</h1></EmptyTitle
        >
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline" as-child>
          <NuxtLinkLocale to="/">{{ $t("return.toHome") }}</NuxtLinkLocale>
        </Button>
      </EmptyContent>
    </template>

    <template v-else-if="state === 'pending'">
      <EmptyHeader>
        <EmptyMedia tone="warning">
          <Clock aria-hidden="true" class="size-6" />
        </EmptyMedia>
        <EmptyTitle
          ><h1>{{ $t("return.pendingTitle") }}</h1></EmptyTitle
        >
        <EmptyDescription>{{ $t("return.pendingBody") }}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button variant="outline" as-child>
          <NuxtLinkLocale to="/cart">{{ $t("return.toCart") }}</NuxtLinkLocale>
        </Button>
      </EmptyContent>
    </template>

    <template v-else>
      <EmptyHeader>
        <EmptyMedia tone="destructive">
          <CircleAlert aria-hidden="true" class="size-6" />
        </EmptyMedia>
        <EmptyTitle role="alert"
          ><h1>{{ $t("return.failedTitle") }}</h1></EmptyTitle
        >
        <EmptyDescription>{{ $t("return.failedBody") }}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <!-- The page keeps the cart in this state, so the customer can try the payment again. -->
        <Button as-child>
          <NuxtLinkLocale to="/cart">{{ $t("return.toCart") }}</NuxtLinkLocale>
        </Button>
      </EmptyContent>
    </template>
  </Empty>
</template>
