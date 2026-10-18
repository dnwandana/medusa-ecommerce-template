<script setup lang="ts">
import type { HttpTypes } from "@medusajs/types"
import { ImageOff } from "@lucide/vue"
import type { BadgeVariants } from "~/components/ui/badge"
import { colourDots } from "~/utils/colourDots"
import { priceView, productBadge, type ProductBadge } from "~/utils/productBadges"

const props = defineProps<{ product: HttpTypes.StoreProduct }>()

// The parent loads the settings. Until they come, the card uses the default rules.
const { settings } = useStorefront()

const BADGE_VARIANTS: Record<ProductBadge, BadgeVariants["variant"]> = {
  soldOut: "out",
  limited: "low",
  sale: "sale",
  new: "new",
}

const price = computed(() => priceView(props.product.variants ?? []))
const badge = computed(() => productBadge(props.product, settings.value))
const dots = computed(() => colourDots(props.product, settings.value.colours))
const dotNames = computed(() => dots.value.map((dot) => dot.name).join(", "))
// The card has no variant selection, so the heart saves the first variant.
const firstVariantId = computed(() => props.product.variants?.[0]?.id ?? null)
const soldOut = computed(() => badge.value === "soldOut")
</script>

<template>
  <div class="relative min-w-0">
    <NuxtLinkLocale
      :to="`/products/${product.handle}`"
      class="group flex flex-col gap-4 outline-none focus-visible:shadow-focus"
    >
      <div
        data-testid="card-photo"
        class="relative overflow-hidden bg-backdrop-sand"
        style="aspect-ratio: 4 / 5"
      >
        <img
          v-if="product.thumbnail"
          :src="product.thumbnail"
          :alt="product.title"
          loading="lazy"
          class="size-full object-cover transition-transform duration-500 group-hover:scale-[1.02] motion-reduce:transition-none"
          :class="soldOut ? 'opacity-55' : ''"
        />
        <div v-else class="flex size-full items-center justify-center">
          <ImageOff class="size-8 text-icon-subtle" :stroke-width="1.5" aria-hidden="true" />
        </div>
        <Badge v-if="badge" :variant="BADGE_VARIANTS[badge]" class="absolute top-4 left-4">
          {{ $t(`products.badges.${badge}`) }}
        </Badge>
      </div>
      <div class="flex flex-col gap-1">
        <span
          class="text-body-sm underline-offset-4 group-hover:underline"
          :class="soldOut ? 'text-muted-foreground' : ''"
        >
          {{ product.title }}
        </span>
        <span
          v-if="dots.length"
          data-testid="colour-dots"
          role="img"
          class="hidden items-center gap-1.5 md:flex"
          :aria-label="$t('products.colours', { names: dotNames })"
        >
          <span
            v-for="dot in dots"
            :key="dot.name"
            class="size-2.5 rounded-full shadow-[inset_0_0_0_1px_rgb(31_27_23/0.2)]"
            :style="{ backgroundColor: dot.hex }"
          />
        </span>
        <span v-if="price.original !== null" class="flex flex-wrap items-baseline gap-x-2">
          <span class="text-price text-sale">{{ formatPrice(price.amount) }}</span>
          <s class="text-price text-muted-foreground">
            <span class="sr-only">{{ $t("products.originalPrice") }}</span>
            {{ formatPrice(price.original) }}
          </s>
          <span class="text-price text-sale">
            {{ $t("products.discount", { percent: price.percent }) }}
          </span>
        </span>
        <span v-else class="text-price" :class="soldOut ? 'text-muted-foreground' : ''">
          {{ formatPrice(price.amount) }}
        </span>
      </div>
    </NuxtLinkLocale>
    <WishlistButton :variant-id="firstVariantId" look="overlay" class="absolute top-2 right-2" />
  </div>
</template>
