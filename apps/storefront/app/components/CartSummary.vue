<script setup lang="ts">
import type { HttpTypes } from "@medusajs/types"
import { Lock } from "@lucide/vue"

const props = withDefaults(defineProps<{ cart: HttpTypes.StoreCart; disabled?: boolean }>(), {
  disabled: false,
})

const savings = computed(() => cartSavings(props.cart.items))

// The capture listener runs before the link navigates. Thus a shopper does not go to the
// checkout while a cart change runs.
function blockDuringChange(event: MouseEvent): void {
  if (props.disabled) {
    event.preventDefault()
  }
}

const linkClass =
  "w-full aria-disabled:cursor-not-allowed aria-disabled:bg-disabled aria-disabled:text-disabled-foreground"
</script>

<template>
  <section
    aria-labelledby="cart-summary-title"
    class="flex flex-col gap-4 bg-card px-5 py-6 md:gap-6 md:p-8"
    @click.capture="blockDuringChange"
  >
    <h2 id="cart-summary-title" class="text-h3">{{ $t("cart.summary") }}</h2>
    <TotalsBlock
      :subtotal="props.cart.item_subtotal ?? 0"
      :savings="savings"
      :delivery="null"
      :total="props.cart.item_total ?? 0"
    />
    <div class="hidden flex-col gap-3 md:flex">
      <Button as-child size="lg" :class="linkClass">
        <NuxtLinkLocale
          to="/checkout"
          data-testid="checkout"
          :aria-disabled="props.disabled ? 'true' : undefined"
        >
          <Lock aria-hidden="true" />
          {{ $t("cart.checkout") }}
        </NuxtLinkLocale>
      </Button>
      <p class="text-center text-body-sm text-muted-foreground">{{ $t("cart.paymentNote") }}</p>
    </div>

    <div
      data-testid="checkout-bar"
      class="fixed inset-x-0 bottom-0 z-40 flex flex-col gap-2 border-t border-border bg-background px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] md:hidden"
    >
      <Button as-child size="lg" :class="linkClass">
        <NuxtLinkLocale to="/checkout" :aria-disabled="props.disabled ? 'true' : undefined">
          <Lock aria-hidden="true" />
          {{ $t("cart.checkoutTotal", { total: formatPrice(props.cart.item_total) }) }}
        </NuxtLinkLocale>
      </Button>
      <p class="text-center text-caption text-muted-foreground">{{ $t("cart.paymentNote") }}</p>
    </div>
  </section>
</template>
