<script setup lang="ts">
import { Check, Copy, TriangleAlert } from "@lucide/vue"
import type { BankAccount } from "~/composables/useBankTransfer"
import type { ReceiptPhase } from "~/utils/orderStatus"

const props = defineProps<{
  amount: number
  deadline: Date
  accounts: BankAccount[]
  phase: ReceiptPhase
  note: { note: string; created_at: string } | null
}>()

const { locale } = useI18n()

const deadlineText = computed(() => formatDeadline(props.deadline, locale.value))

// The 24-hour rule stops after the first receipt. Thus the deadline shows only before it.
const showDeadline = computed(() => props.phase === "none")
// After a receipt, the store checks the payment. The accounts show again when the store asks for
// more payment.
const showAccounts = computed(() => props.phase !== "submitted")

// Only one account at a time shows the result of a copy, so that the text stays on the clicked button.
const copiedId = ref<string | null>(null)
const failedId = ref<string | null>(null)

async function copyNumber(account: BankAccount): Promise<void> {
  copiedId.value = null
  failedId.value = null
  try {
    // An old browser or a page that is not secure has no clipboard. The customer then copies by hand.
    if (!navigator.clipboard) {
      throw new Error("The clipboard is not available.")
    }
    await navigator.clipboard.writeText(account.account_number)
    copiedId.value = account.id
  } catch {
    failedId.value = account.id
  }
}
</script>

<template>
  <Card>
    <CardHeader>
      <CardTitle
        ><h2>
          {{ phase === "submitted" ? $t("bankTransfer.checkingTitle") : $t("bankTransfer.title") }}
        </h2></CardTitle
      >
    </CardHeader>
    <CardContent class="flex flex-col gap-4">
      <Alert v-if="phase === 'more' && note" variant="warning">
        <TriangleAlert :stroke-width="1.5" aria-hidden="true" />
        <AlertTitle>{{ $t("bankTransfer.noteTitle") }}</AlertTitle>
        <AlertDescription class="flex flex-col gap-1 text-current">
          <!-- The note is text from the store. Text interpolation escapes it, and the class keeps
               its line breaks. -->
          <blockquote
            data-testid="store-note"
            class="border-l-2 border-current pl-3 break-words whitespace-pre-line"
          >
            {{ note.note }}
          </blockquote>
          <p>{{ $t("bankTransfer.noteAction") }}</p>
        </AlertDescription>
      </Alert>

      <div class="flex flex-col gap-1">
        <p class="text-body-sm text-muted-foreground">{{ $t("bankTransfer.amount") }}</p>
        <p class="text-price-lg" data-testid="bank-transfer-amount">{{ formatPrice(amount) }}</p>
        <template v-if="showDeadline">
          <p class="text-body-sm">{{ $t("bankTransfer.exactAmount") }}</p>
          <p class="text-body-sm font-medium">
            {{ $t("bankTransfer.deadlineUpload", { deadline: deadlineText }) }}
          </p>
          <p class="text-body-sm text-muted-foreground">{{ $t("bankTransfer.cancelWarning") }}</p>
        </template>
      </div>

      <template v-if="showAccounts">
        <p v-if="accounts.length === 0" role="alert" class="text-body-sm text-destructive">
          {{ $t("bankTransfer.noAccounts") }}
        </p>

        <div v-else class="flex flex-col gap-3">
          <Item v-for="account in accounts" :key="account.id" variant="outline">
            <ItemContent>
              <ItemTitle>{{ account.bank_name }}</ItemTitle>
              <!-- A monospace font and select-all, so that the customer can copy the number by hand. -->
              <p class="font-mono text-base break-all select-all" data-testid="account-number">
                {{ account.account_number }}
              </p>
              <p class="text-body-sm break-words text-muted-foreground">
                {{ $t("bankTransfer.holder") }}: {{ account.account_holder }}
              </p>
              <p v-if="failedId === account.id" role="status" class="text-body-sm text-destructive">
                {{ $t("bankTransfer.copyFailed") }}
              </p>
            </ItemContent>
            <ItemActions>
              <Button
                variant="outline"
                size="sm"
                data-testid="copy-account"
                :aria-label="`${$t('bankTransfer.copy')} ${account.bank_name} ${account.account_number}`"
                @click="copyNumber(account)"
              >
                <Check v-if="copiedId === account.id" aria-hidden="true" />
                <Copy v-else aria-hidden="true" />
                <span aria-live="polite">{{
                  copiedId === account.id ? $t("bankTransfer.copied") : $t("bankTransfer.copy")
                }}</span>
              </Button>
            </ItemActions>
          </Item>
        </div>
      </template>
    </CardContent>
  </Card>
</template>
