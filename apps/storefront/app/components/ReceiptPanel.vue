<script setup lang="ts">
import { FileImage, Mail, MessageCircle } from "@lucide/vue"
import type { BankTransferDetails } from "~/composables/useBankTransfer"
import type { OrderPaymentState } from "~/utils/orderStatus"
import { whatsappHref } from "~/utils/orderNotices"

const props = defineProps<{
  orderId: string
  state: OrderPaymentState
  contact: BankTransferDetails["contact"] | null
}>()
const emit = defineEmits<{ uploaded: [] }>()

const { locale } = useI18n()

// The panel shows only the name and the time of a receipt. The receipt files are private.
const receipts = computed(() =>
  [...props.state.receipts].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  )
)
const remaining = computed(() => Math.max(MAX_RECEIPTS - receipts.value.length, 0))

const email = computed(() => props.contact?.email || null)
const whatsapp = computed(() => {
  const href = whatsappHref(props.contact?.whatsapp)
  return href ? { href, text: props.contact!.whatsapp! } : null
})
</script>

<template>
  <Card>
    <CardContent class="flex flex-col gap-5">
      <div class="flex flex-col gap-2">
        <h3 class="text-h4">{{ $t("receipt.title") }}</h3>
        <p class="text-body-sm text-muted-foreground">
          <template v-if="receipts.length === 0">{{ $t("receipt.helpFirst") }}</template>
          <template v-else-if="remaining > 0">
            {{ $t("receipt.helpMore", { count: remaining }, remaining) }}
          </template>
          <template v-else>{{ $t("receipt.helpMax") }}</template>
        </p>
      </div>

      <div v-if="receipts.length > 0" class="flex flex-col gap-2">
        <h4 class="text-body-sm font-semibold">{{ $t("receipt.listTitle") }}</h4>
        <ul class="flex flex-col">
          <li
            v-for="receipt in receipts"
            :key="receipt.id"
            data-testid="receipt-row"
            class="grid grid-cols-[2.5rem_minmax(0,1fr)] items-center gap-4 border-t border-border py-4 last:border-b"
          >
            <span
              aria-hidden="true"
              class="flex size-10 items-center justify-center bg-secondary text-muted-foreground"
            >
              <FileImage :stroke-width="1.5" class="size-[18px]" />
            </span>
            <div class="flex min-w-0 flex-col gap-1">
              <p class="text-body-sm break-words">{{ receipt.file_name }}</p>
              <p class="text-caption text-muted-foreground">
                {{
                  $t("receipt.uploadedAt", {
                    date: formatDeadline(new Date(receipt.created_at), locale),
                  })
                }}
              </p>
            </div>
          </li>
        </ul>
      </div>

      <ReceiptUploadForm v-if="remaining > 0" :order-id="orderId" @uploaded="emit('uploaded')" />

      <div v-else class="flex flex-col gap-3 bg-secondary p-6">
        <p class="text-body-sm">{{ $t("receipt.maxContact") }}</p>
        <p v-if="email" class="flex items-center gap-2 text-body-sm">
          <Mail :stroke-width="1.5" aria-hidden="true" class="size-4 flex-none" />
          <a
            :href="`mailto:${email}`"
            class="inline-flex min-h-11 items-center break-all text-link underline underline-offset-4 hover:text-muted-foreground"
            >{{ email }}</a
          >
        </p>
        <p v-if="whatsapp" class="flex items-center gap-2 text-body-sm">
          <MessageCircle :stroke-width="1.5" aria-hidden="true" class="size-4 flex-none" />
          <a
            :href="whatsapp.href"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex min-h-11 items-center break-all text-link underline underline-offset-4 hover:text-muted-foreground"
            >{{ whatsapp.text }}</a
          >
        </p>
      </div>
    </CardContent>
  </Card>
</template>
