<script setup lang="ts">
import { CircleCheck } from "@lucide/vue"

// A guest has no account, so this page has no auth middleware. The long random order ID is the key.
const { t, locale } = useI18n()
const route = useRoute()
const { getOrder } = useOrders()
const { getDetails } = useBankTransfer()

const { data: order } = await useAsyncData(
  () => `order:${locale.value}:${route.params.id}`,
  () => getOrder(String(route.params.id))
)

if (!order.value) {
  throw createError({ statusCode: 404, statusMessage: t("order.notFound"), fatal: true })
}

// A captured order or a gateway order must not show the bank details.
const awaitingBankTransfer = computed(() => !!order.value && isAwaitingBankTransfer(order.value))

const { data: bankAccounts } = await useAsyncData(
  () => `bank-transfer:${route.params.id}`,
  async () => {
    if (!awaitingBankTransfer.value) {
      return null
    }
    try {
      const { bank_accounts } = await getDetails()
      return bank_accounts
    } catch {
      // A failed request must not hide the order. The component then shows the contact text.
      return []
    }
  }
)

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

    <BankTransferInstructions
      v-if="awaitingBankTransfer"
      :amount="order.total"
      :deadline="bankTransferDeadline(order.created_at)"
      :accounts="bankAccounts ?? []"
    />

    <OrderSummary :order="order" />

    <div>
      <Button variant="outline" size="lg" as-child>
        <NuxtLinkLocale to="/products">{{ $t("cart.continue") }}</NuxtLinkLocale>
      </Button>
    </div>
  </div>
</template>
