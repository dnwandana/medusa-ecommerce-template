<script setup lang="ts">
import type { HomeCampaign } from "~/types/storefront"

const props = defineProps<{ campaign: HomeCampaign | null }>()

const titleParts = computed(() => (props.campaign ? campaignTitleParts(props.campaign.title) : []))
</script>

<template>
  <!-- The hero spans the full width of the page, so it cancels the side padding of the main. -->
  <section v-if="campaign" aria-labelledby="home-hero-title" class="-mx-4 md:-mx-12">
    <picture class="block h-[500px] w-full overflow-hidden bg-backdrop-sand md:h-[720px]">
      <source
        v-if="campaign.mobile_image_url"
        media="(max-width: 767px)"
        :srcset="campaign.mobile_image_url"
      />
      <!-- The title is the text of the hero. Thus the photo has an empty alt. -->
      <img
        :src="campaign.image_url"
        alt=""
        class="size-full object-cover"
        fetchpriority="high"
        data-testid="home-hero-image"
      />
    </picture>
    <div
      class="grid gap-6 px-4 pt-10 pb-4 md:grid-cols-2 md:items-end md:gap-12 md:px-12 md:pt-16 md:pb-8"
    >
      <div class="flex flex-col gap-4">
        <p v-if="campaign.eyebrow" class="text-eyebrow text-muted-foreground">
          {{ campaign.eyebrow }}
        </p>
        <h1 id="home-hero-title" class="text-display">
          <template v-for="(part, index) in titleParts" :key="index">
            <em v-if="part.italic" class="italic">{{ part.text }}</em>
            <template v-else>{{ part.text }}</template>
          </template>
        </h1>
      </div>
      <div class="flex max-w-[440px] flex-col items-start gap-6 md:justify-self-end">
        <p v-if="campaign.text" class="text-body-lg text-muted-foreground">{{ campaign.text }}</p>
        <Button as-child variant="outline" class="w-full md:w-auto">
          <NuxtLinkLocale :to="campaign.link">{{ campaign.button_label }}</NuxtLinkLocale>
        </Button>
      </div>
    </div>
  </section>
  <section v-else aria-labelledby="home-hero-title" class="-mx-4 bg-backdrop-sand md:-mx-12">
    <div class="flex flex-col items-start gap-6 px-4 py-16 md:px-12 md:py-28">
      <h1 id="home-hero-title" class="max-w-[16ch] text-display">{{ $t("home.title") }}</h1>
      <p class="max-w-[52ch] text-body-lg text-muted-foreground">{{ $t("home.subtitle") }}</p>
      <Button as-child variant="outline" class="w-full md:w-auto">
        <NuxtLinkLocale to="/products">{{ $t("home.viewAll") }}</NuxtLinkLocale>
      </Button>
    </div>
  </section>
</template>
