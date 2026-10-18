<script setup lang="ts">
import { ImageOff } from "@lucide/vue"
import type { GalleryImage } from "~/utils/galleryImages"

const props = defineProps<{ images: GalleryImage[]; title: string; badgeLabel?: string | null }>()
const emit = defineEmits<{ open: [index: number] }>()

const list = useTemplateRef<HTMLUListElement>("list")
const photoButtons = useTemplateRef<HTMLButtonElement[]>("photoButtons")
const current = ref(0)

const progress = computed(() =>
  Math.round(((current.value + 1) / Math.max(props.images.length, 1)) * 100)
)

// Below 1024 px the list is a carousel with one photo for each list width.
function onScroll() {
  const element = list.value
  if (!element || element.clientWidth === 0) {
    return
  }
  const index = Math.round(element.scrollLeft / element.clientWidth)
  current.value = Math.min(Math.max(index, 0), Math.max(props.images.length - 1, 0))
}

// A new colour gives new photos, so the carousel starts again at the first photo.
watch(
  () => props.images,
  () => {
    current.value = 0
    if (list.value) {
      list.value.scrollLeft = 0
    }
  }
)

function focusPhoto(index: number) {
  const button = photoButtons.value?.[index]
  if (!button) {
    return
  }
  if (list.value) {
    list.value.scrollLeft = index * list.value.clientWidth
  }
  current.value = index
  button.focus()
}

defineExpose({ focusPhoto })
</script>

<template>
  <div class="flex flex-col gap-4">
    <div
      v-if="images.length === 0"
      role="img"
      :aria-label="title"
      class="relative -mx-4 flex items-center justify-center bg-muted md:-mx-12 lg:mx-0"
      style="aspect-ratio: 4 / 5"
    >
      <ImageOff class="size-8 text-icon-subtle" :stroke-width="1.5" aria-hidden="true" />
      <Badge v-if="badgeLabel" variant="new" class="absolute top-4 left-4">
        {{ badgeLabel }}
      </Badge>
    </div>
    <template v-else>
      <!-- One list for all widths: a carousel below 1024 px, a stack of photos from 1024 px. -->
      <ul
        ref="list"
        :aria-label="$t('product.photos')"
        class="-mx-4 flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] md:-mx-12 lg:mx-0 lg:snap-none lg:flex-col lg:gap-0.5 lg:overflow-visible [&::-webkit-scrollbar]:hidden"
        @scroll.passive="onScroll"
      >
        <li v-for="(image, index) in images" :key="image.id" class="w-full shrink-0 snap-start">
          <button
            ref="photoButtons"
            type="button"
            class="relative block w-full cursor-zoom-in overflow-hidden bg-muted outline-none focus-visible:shadow-focus"
            style="aspect-ratio: 4 / 5"
            :aria-label="$t('product.openPhoto', { index: index + 1, total: images.length })"
            @click="emit('open', index)"
          >
            <img
              :src="image.url"
              alt=""
              draggable="false"
              class="size-full object-cover"
              :fetchpriority="index === 0 ? 'high' : undefined"
              :loading="index === 0 ? undefined : 'lazy'"
            />
            <Badge v-if="index === 0 && badgeLabel" variant="new" class="absolute top-4 left-4">
              {{ badgeLabel }}
            </Badge>
          </button>
        </li>
      </ul>
      <ProgressRule
        v-if="images.length > 1"
        class="lg:hidden"
        :label="$t('product.photos')"
        :value="progress"
      />
    </template>
  </div>
</template>
