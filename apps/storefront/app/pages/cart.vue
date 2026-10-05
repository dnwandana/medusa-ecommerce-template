<script setup lang="ts">
const { t } = useI18n()
const { cart, load, updateItem, removeItem } = useCart()

const ready = ref(false)
const busy = ref(false)
const failed = ref(false)

// Runs one change of the cart and shows an error if the change fails.
async function change(action: () => Promise<void>): Promise<void> {
  busy.value = true
  failed.value = false
  try {
    await action()
  } catch {
    failed.value = true
  } finally {
    busy.value = false
  }
}

// The cart cookie is in the browser. Load the cart after the mount.
onMounted(async () => {
  try {
    await load()
  } catch {
    failed.value = true
  }
  ready.value = true
})

useHead({ title: () => t("cart.title") })
</script>

<template>
  <div class="flex flex-col gap-6">
    <h1 class="text-2xl font-semibold">{{ $t("cart.title") }}</h1>

    <p v-if="!ready">{{ $t("common.loading") }}</p>
    <template v-else>
      <p v-if="failed" role="alert" class="text-destructive">{{ $t("common.error") }}</p>

      <div v-if="!cart?.items?.length" class="flex flex-col items-start gap-2">
        <p>{{ $t("cart.empty") }}</p>
        <NuxtLinkLocale to="/products" class="underline underline-offset-4">
          {{ $t("cart.continue") }}
        </NuxtLinkLocale>
      </div>

      <template v-else>
        <div>
          <CartLineItem
            v-for="item in cart.items"
            :key="item.id"
            :item="item"
            :disabled="busy"
            @update="(quantity) => change(() => updateItem(item.id, quantity))"
            @remove="change(() => removeItem(item.id))"
          />
        </div>

        <dl class="ml-auto grid w-full max-w-sm grid-cols-2 gap-2">
          <dt>{{ $t("cart.subtotal") }}</dt>
          <dd class="text-right">
            <span data-testid="subtotal">{{ formatPrice(cart.item_subtotal) }}</span>
          </dd>
          <dt>{{ $t("cart.shipping") }}</dt>
          <dd class="text-right text-muted-foreground">{{ $t("cart.shippingAtCheckout") }}</dd>
        </dl>

        <div class="flex justify-end">
          <Button as-child>
            <NuxtLinkLocale to="/checkout">{{ $t("cart.checkout") }}</NuxtLinkLocale>
          </Button>
        </div>
      </template>
    </template>
  </div>
</template>
