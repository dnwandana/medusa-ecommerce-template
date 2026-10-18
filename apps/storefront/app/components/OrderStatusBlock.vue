<script setup lang="ts">
import { Info } from "@lucide/vue"
import type { BankTransferDetails } from "~/composables/useBankTransfer"
import { cancelNoticeKey, whatsappHref } from "~/utils/orderNotices"

type StoreContact = BankTransferDetails["contact"]

const props = defineProps<{
  status: "cancelled" | "refunded"
  cancelReason: string | null
  refunded: number
  contact: StoreContact | null
}>()

const showRefund = computed(() => props.status === "refunded" || props.refunded > 0)
const email = computed(() => props.contact?.email || null)
const whatsapp = computed(() => {
  const href = whatsappHref(props.contact?.whatsapp)
  return href ? { href, text: props.contact!.whatsapp! } : null
})
</script>

<template>
  <div data-testid="order-status-block" class="flex items-start gap-4 border-t border-border pt-6">
    <Info class="mt-0.5 size-5 flex-none text-muted-foreground" aria-hidden="true" />
    <div class="flex min-w-0 flex-col gap-3">
      <p v-if="status === 'cancelled'" class="text-body">{{ $t(cancelNoticeKey(cancelReason)) }}</p>
      <p v-if="showRefund" class="text-body">
        {{ $t("order.refundedAmount", { amount: formatPrice(refunded) }) }}
      </p>
      <!-- Separate text nodes keep the word order of each language around the links. -->
      <p v-if="email || whatsapp" class="text-body-sm text-muted-foreground">
        {{ $t("order.contactUs") }}
        <a
          v-if="email"
          :href="`mailto:${email}`"
          class="inline-flex min-h-11 items-center break-all text-link underline underline-offset-4 hover:text-muted-foreground"
          >{{ email }}</a
        >
        <!-- The template compiler removes the white space between two elements. -->
        <template v-if="email && whatsapp">{{ ` ${$t("order.or")} ` }}</template>
        <a
          v-if="whatsapp"
          :href="whatsapp.href"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex min-h-11 items-center break-all text-link underline underline-offset-4 hover:text-muted-foreground"
          >{{ whatsapp.text }}</a
        >
      </p>
    </div>
  </div>
</template>
