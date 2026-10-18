<script setup lang="ts">
import type { HttpTypes } from "@medusajs/types"
import { localizedLines, productFabric, readProductDetails } from "~/utils/productDetails"

const props = defineProps<{ product: HttpTypes.StoreProduct }>()

const { t, locale } = useI18n()

const parsed = computed(() => readProductDetails(props.product.metadata))
const details = computed(() => localizedLines(parsed.value.details, locale.value))
// The fabric of the product tag is the first line of "Fabric and care".
const care = computed(() => {
  const fabric = productFabric(props.product)
  const lines = localizedLines(parsed.value.care, locale.value)
  return fabric ? [fabric, ...lines] : lines
})

const items = computed(() => [
  ...(details.value.length ? [{ id: "details", title: t("product.details") }] : []),
  ...(care.value.length ? [{ id: "care", title: t("product.care") }] : []),
])
</script>

<template>
  <HairlineAccordion v-if="items.length" :items="items" :heading-level="2">
    <template #details>
      <ul class="flex list-disc flex-col gap-1.5 pl-[18px] text-muted-foreground">
        <li v-for="(line, index) in details" :key="index">{{ line }}</li>
      </ul>
    </template>
    <template #care>
      <ul class="flex list-disc flex-col gap-1.5 pl-[18px] text-muted-foreground">
        <li v-for="(line, index) in care" :key="index">{{ line }}</li>
      </ul>
    </template>
  </HairlineAccordion>
</template>
