<script setup lang="ts">
import { CircleAlert, Clock, ShoppingBag } from "@lucide/vue"
import type { Component } from "vue"
import type { EmptyMediaVariants } from "~/components/ui/empty"

type EmptyMediaTone = NonNullable<EmptyMediaVariants["tone"]>

definePageMeta({ layout: "checkout" })

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
  // A payment page returns to a URL with no locale prefix. The cookie keeps the locale of the
  // customer.
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

const TITLES: Record<ReturnState, string> = {
  confirming: "return.confirming",
  noCart: "return.noCart",
  pending: "return.pendingTitle",
  failed: "return.failedTitle",
}

// The confirming state shows a Spinner, so it has no icon here.
const MEDIA: Record<ReturnState, { icon: Component | null; tone: EmptyMediaTone }> = {
  confirming: { icon: null, tone: "muted" },
  noCart: { icon: ShoppingBag, tone: "muted" },
  pending: { icon: Clock, tone: "warning" },
  failed: { icon: CircleAlert, tone: "destructive" },
}
const media = computed(() => MEDIA[state.value])
</script>

<template>
  <div class="py-12 md:py-32">
    <!-- One block for the four states. The eyebrow and the hairlines stay, the state changes. -->
    <Empty
      data-testid="return-block"
      class="mx-auto max-w-xl gap-4 border-y border-border px-0 py-12 md:py-16"
    >
      <EmptyMedia :tone="media.tone">
        <Spinner v-if="state === 'confirming'" class="size-6" />
        <component :is="media.icon" v-else aria-hidden="true" class="size-6" />
      </EmptyMedia>

      <EmptyHeader class="gap-4">
        <p class="text-eyebrow text-muted-foreground">{{ $t("checkout.title") }}</p>
        <EmptyTitle
          :role="state === 'confirming' ? 'status' : state === 'failed' ? 'alert' : undefined"
          class="text-h1"
        >
          <h1>{{ $t(TITLES[state]) }}</h1>
        </EmptyTitle>
        <EmptyDescription
          v-if="state === 'pending' || state === 'failed'"
          class="text-body text-muted-foreground md:text-body-lg"
        >
          {{ $t(state === "pending" ? "return.pendingBody" : "return.failedBody") }}
        </EmptyDescription>
      </EmptyHeader>

      <EmptyContent v-if="state === 'noCart'" class="mt-4">
        <Button variant="outline" class="w-full md:w-auto" as-child>
          <NuxtLinkLocale to="/">{{ $t("return.toHome") }}</NuxtLinkLocale>
        </Button>
      </EmptyContent>
      <EmptyContent v-else-if="state === 'pending'" class="mt-4">
        <Button variant="outline" class="w-full md:w-auto" as-child>
          <NuxtLinkLocale to="/cart">{{ $t("return.toCart") }}</NuxtLinkLocale>
        </Button>
      </EmptyContent>
      <EmptyContent v-else-if="state === 'failed'" class="mt-4">
        <!-- The page keeps the cart in this state, so the customer can try the payment again. -->
        <Button class="w-full md:w-auto" as-child>
          <NuxtLinkLocale to="/cart">{{ $t("return.toCart") }}</NuxtLinkLocale>
        </Button>
      </EmptyContent>
    </Empty>
  </div>
</template>
