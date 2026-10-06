<script setup lang="ts">
import { ShoppingBag } from "@lucide/vue"

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
    <h1 class="text-h1">{{ $t("cart.title") }}</h1>

    <p v-if="!ready" role="status">{{ $t("common.loading") }}</p>
    <template v-else>
      <Alert v-if="failed" variant="destructive">
        <AlertDescription>{{ $t("common.error") }}</AlertDescription>
      </Alert>

      <Empty v-if="!cart?.items?.length" variant="outline">
        <EmptyHeader>
          <EmptyMedia>
            <ShoppingBag aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>{{ $t("cart.empty") }}</EmptyTitle>
          <EmptyDescription>{{ $t("cart.emptyBody") }}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button as-child>
            <NuxtLinkLocale to="/products">{{ $t("cart.continue") }}</NuxtLinkLocale>
          </Button>
        </EmptyContent>
      </Empty>

      <div v-else class="grid items-start gap-6 md:grid-cols-[minmax(0,1fr)_380px] md:gap-12">
        <div :class="{ 'opacity-60': busy }">
          <template v-for="(item, index) in cart.items" :key="item.id">
            <Separator v-if="index > 0" />
            <CartLineItem
              :item="item"
              :disabled="busy"
              @update="(quantity) => change(() => updateItem(item.id, quantity))"
              @remove="change(() => removeItem(item.id))"
            />
          </template>
        </div>

        <Card class="rounded-xl">
          <CardHeader>
            <CardTitle>{{ $t("cart.summary") }}</CardTitle>
          </CardHeader>
          <CardContent>
            <dl class="grid grid-cols-2 gap-3">
              <dt>{{ $t("cart.subtotal") }}</dt>
              <dd class="text-right text-price">
                <span data-testid="subtotal">{{ formatPrice(cart.item_subtotal) }}</span>
              </dd>
              <dt>{{ $t("cart.shipping") }}</dt>
              <dd class="text-right text-body-sm text-muted-foreground">{{ $t("cart.shippingAtCheckout") }}</dd>
            </dl>
          </CardContent>
          <CardFooter class="flex-col gap-3">
            <Button size="lg" class="w-full" as-child>
              <NuxtLinkLocale to="/checkout">{{ $t("cart.checkout") }}</NuxtLinkLocale>
            </Button>
            <Button variant="outline" size="lg" class="w-full" as-child>
              <NuxtLinkLocale to="/products">{{ $t("cart.continue") }}</NuxtLinkLocale>
            </Button>
            <TrustLines class="self-start" />
          </CardFooter>
        </Card>
      </div>
    </template>
  </div>
</template>
