<script setup lang="ts">
import { Check, Copy, ExternalLink } from "@lucide/vue"
import type { TrackingShipment } from "~/composables/useOrders"
import { safeTrackingUrl } from "~/utils/trackingLink"

const props = defineProps<{ shipments: TrackingShipment[]; optionName: string | null }>()

const { locale } = useI18n()

const rows = computed(() =>
  props.shipments.map((shipment) => ({
    ...shipment,
    date: formatOrderDate(shipment.shipped_at, locale.value),
    labels: shipment.labels.map((label) => ({
      ...label,
      // Two shipments can have the same tracking number. Thus the key has the shipment id.
      key: `${shipment.id}:${label.tracking_number}`,
      url: safeTrackingUrl(label.tracking_url),
    })),
  }))
)

// Only one label at a time shows the result of a copy, so that the text stays on the clicked button.
const copiedKey = ref<string | null>(null)
const failedKey = ref<string | null>(null)

async function copyNumber(key: string, number: string): Promise<void> {
  copiedKey.value = null
  failedKey.value = null
  try {
    // An old browser or a page that is not secure has no clipboard. The customer then copies by hand.
    if (!navigator.clipboard) {
      throw new Error("The clipboard is not available.")
    }
    await navigator.clipboard.writeText(number)
    copiedKey.value = key
  } catch {
    failedKey.value = key
  }
}
</script>

<template>
  <section v-if="rows.length > 0" class="flex flex-col gap-6">
    <h2 class="text-h3">{{ $t("order.shipment.title") }}</h2>
    <div
      v-for="shipment in rows"
      :key="shipment.id"
      :data-testid="`shipment-${shipment.id}`"
      class="flex flex-col gap-6 border-t border-border pt-6"
    >
      <p class="text-body-sm text-muted-foreground">
        {{
          optionName
            ? $t("order.shipment.shippedOn", { date: shipment.date, option: optionName })
            : $t("order.shipment.shippedOnNoOption", { date: shipment.date })
        }}
      </p>
      <div
        v-for="label in shipment.labels"
        :key="label.key"
        class="grid gap-x-6 gap-y-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end"
      >
        <div class="flex min-w-0 flex-col gap-2">
          <p class="text-field-label text-muted-foreground">
            {{ $t("order.shipment.trackingNumber") }}
          </p>
          <!-- A monospace font and select-all, so that the customer can copy the number by hand. -->
          <p class="font-mono text-body-lg break-all select-all" data-testid="tracking-number">
            {{ label.tracking_number }}
          </p>
          <p v-if="failedKey === label.key" role="status" class="text-body-sm text-destructive">
            {{ $t("bankTransfer.copyFailed") }}
          </p>
        </div>
        <div class="flex flex-wrap gap-3">
          <Button
            variant="outline"
            size="sm"
            data-testid="copy-tracking"
            :aria-label="`${$t('bankTransfer.copy')} ${label.tracking_number}`"
            @click="copyNumber(label.key, label.tracking_number)"
          >
            <Check v-if="copiedKey === label.key" aria-hidden="true" />
            <Copy v-else aria-hidden="true" />
            <span aria-live="polite">{{
              copiedKey === label.key ? $t("bankTransfer.copied") : $t("bankTransfer.copy")
            }}</span>
          </Button>
          <Button v-if="label.url" as-child size="sm">
            <a
              :href="label.url"
              target="_blank"
              rel="noopener noreferrer"
              data-testid="track-parcel"
            >
              {{ $t("order.shipment.track") }}
              <ExternalLink aria-hidden="true" />
              <span class="sr-only"> {{ $t("order.shipment.newTab") }}</span>
            </a>
          </Button>
        </div>
      </div>
    </div>
  </section>
</template>
