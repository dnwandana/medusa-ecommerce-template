<script setup lang="ts">
const props = defineProps<{
  subtotal: number
  savings?: number
  delivery: number | null | undefined
  discount?: number
  total: number
  totalLabel?: string
}>()

const { t } = useI18n()

// The subtotal already uses the sale prices. Thus the savings row is information only.
const rows = computed(() => {
  const list: { key: string; label: string; value: string }[] = [
    { key: "subtotal", label: t("common.subtotal"), value: formatPrice(props.subtotal) },
  ]
  if ((props.savings ?? 0) > 0) {
    list.push({
      key: "savings",
      label: t("common.youSave"),
      value: `-${formatPrice(props.savings)}`,
    })
  }
  list.push({
    key: "delivery",
    label: t("common.delivery"),
    value:
      props.delivery === null || props.delivery === undefined
        ? t("common.deliveryAtCheckout")
        : formatDeliveryPrice(props.delivery, t("common.free")),
  })
  if ((props.discount ?? 0) > 0) {
    list.push({
      key: "discount",
      label: t("common.discount"),
      value: `-${formatPrice(props.discount)}`,
    })
  }
  return list
})
</script>

<template>
  <dl class="flex flex-col gap-3">
    <div
      v-for="row in rows"
      :key="row.key"
      data-slot="totals-row"
      :data-row="row.key"
      class="flex items-baseline justify-between gap-4"
    >
      <dt class="text-body-sm text-muted-foreground">{{ row.label }}</dt>
      <dd class="text-price text-foreground">{{ row.value }}</dd>
    </div>
    <div
      data-slot="totals-row"
      data-row="total"
      class="flex items-baseline justify-between gap-4 border-t border-border pt-4"
    >
      <dt class="text-body-sm font-medium text-foreground">
        {{ totalLabel ?? t("common.total") }}
      </dt>
      <dd class="text-price-lg text-foreground">{{ formatPrice(total) }}</dd>
    </div>
  </dl>
</template>
