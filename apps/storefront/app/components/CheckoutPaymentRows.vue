<script setup lang="ts">
import type { PaymentRowKeys } from "~/utils/paymentRows"
import { paymentRowKeys } from "~/utils/paymentRows"

type PaymentProvider = { id: string }

const props = defineProps<{
  providers: PaymentProvider[]
  state: "loading" | "ready" | "failed"
  disabled?: boolean
}>()
const selected = defineModel<string | null>({ required: true })

defineEmits<{ retry: [] }>()

const { te } = useI18n()

const rows = computed<(PaymentRowKeys & { id: string })[]>(() =>
  props.providers.map((provider) => ({ id: provider.id, ...paymentRowKeys(provider.id, te) }))
)
</script>

<template>
  <div v-if="state === 'loading'" role="status">
    <span class="sr-only">{{ $t("common.loading") }}</span>
    <div
      v-for="width in ['w-2/5', 'w-1/2', 'w-1/3']"
      :key="width"
      data-testid="payment-skeleton-row"
      class="flex h-16 items-center gap-4 border-b border-border"
    >
      <Skeleton class="size-[18px] rounded-full" />
      <Skeleton class="h-4" :class="width" />
    </div>
  </div>

  <Alert v-else-if="state === 'failed'" variant="destructive" data-testid="payment-providers-error">
    <AlertDescription>{{ $t("common.error") }}</AlertDescription>
    <AlertAction>
      <Button
        type="button"
        variant="outline"
        size="sm"
        data-testid="payment-providers-retry"
        :disabled="disabled"
        @click="$emit('retry')"
      >
        {{ $t("common.retry") }}
      </Button>
    </AlertAction>
  </Alert>

  <p v-else-if="!rows.length" class="text-body-sm text-muted-foreground">
    {{ $t("checkout.noPaymentProviders") }}
  </p>

  <!-- One provider needs no choice, so the row has no radio and shows as selected. -->
  <RadioRow
    v-else-if="rows.length === 1"
    single
    :data-testid="`payment-provider-${rows[0]!.id}`"
    :value="rows[0]!.id"
    :title="$t(rows[0]!.title)"
    :caption="$t(rows[0]!.caption)"
  >
    <p v-if="rows[0]!.hint" class="text-body-sm text-muted-foreground">
      {{ $t(rows[0]!.hint) }}
    </p>
  </RadioRow>

  <RadioGroup v-else v-model="selected" name="payment_provider" class="gap-0" :disabled="disabled">
    <RadioRow
      v-for="row in rows"
      :key="row.id"
      :data-testid="`payment-provider-${row.id}`"
      :value="row.id"
      :title="$t(row.title)"
      :caption="$t(row.caption)"
    >
      <!-- The hint has the indent of the row text. -->
      <p v-if="row.hint" class="pl-[34px] text-body-sm text-muted-foreground">
        {{ $t(row.hint) }}
      </p>
    </RadioRow>
  </RadioGroup>
</template>
