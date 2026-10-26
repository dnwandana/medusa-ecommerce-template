<script setup lang="ts">
import { Info } from "@lucide/vue"
import type { StoreContact } from "~/types/storefront"
import { cancelNoticeKey, whatsappHref } from "~/utils/orderNotices"

const props = defineProps<{
  status: "cancelled" | "refunded"
  cancelReason: string | null
  refunded: number
  contact: StoreContact | null
  // The payment deadline of the backend. It is null when the bank transfer details do not load.
  deadlineHours: number | null
}>()

// The timeout text names the hours. With no hours, the block uses the text with no number.
const cancelNotice = computed(() => {
  const key = cancelNoticeKey(props.cancelReason)
  if (key !== "order.cancelledTimeout") {
    return { key, params: {} }
  }
  return props.deadlineHours === null
    ? { key: "order.cancelledUnpaid", params: {} }
    : { key, params: { hours: props.deadlineHours } }
})

const showRefund = computed(() => props.status === "refunded" || props.refunded > 0)
// The sentence lists the present values in this order: email, WhatsApp, phone.
const links = computed(() => {
  const contact = props.contact
  const list: { key: string; href: string; text: string; external: boolean }[] = []
  if (contact?.email) {
    list.push({
      key: "email",
      href: `mailto:${contact.email}`,
      text: contact.email,
      external: false,
    })
  }
  const whatsapp = whatsappHref(contact?.whatsapp)
  if (whatsapp) {
    list.push({ key: "whatsapp", href: whatsapp, text: contact!.whatsapp!, external: true })
  }
  if (contact?.phone) {
    list.push({ key: "phone", href: `tel:${contact.phone}`, text: contact.phone, external: false })
  }
  return list
})
</script>

<template>
  <div data-testid="order-status-block" class="flex items-start gap-4 border-t border-border pt-6">
    <Info class="mt-0.5 size-5 flex-none text-muted-foreground" aria-hidden="true" />
    <div class="flex min-w-0 flex-col gap-3">
      <p v-if="status === 'cancelled'" class="text-body">
        {{ $t(cancelNotice.key, cancelNotice.params) }}
      </p>
      <p v-if="showRefund" class="text-body">
        {{ $t("order.refundedAmount", { amount: formatPrice(refunded) }) }}
      </p>
      <!-- Separate text nodes keep the word order of each language around the links. -->
      <p v-if="links.length" class="text-body-sm text-muted-foreground">
        {{ $t("order.contactUs") }}
        <template v-for="(link, index) in links" :key="link.key">
          <!-- The template compiler removes the white space between two elements. -->
          <template v-if="index > 0">{{
            index === links.length - 1 ? ` ${$t("order.or")} ` : ", "
          }}</template>
          <a
            :href="link.href"
            :target="link.external ? '_blank' : undefined"
            :rel="link.external ? 'noopener noreferrer' : undefined"
            class="inline-flex min-h-11 items-center break-all text-link underline underline-offset-4 hover:text-muted-foreground"
            >{{ link.text }}</a
          >
        </template>
      </p>
    </div>
  </div>
</template>
