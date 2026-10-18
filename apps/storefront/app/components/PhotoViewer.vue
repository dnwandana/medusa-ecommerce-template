<script setup lang="ts">
import { ChevronLeft, ChevronRight } from "@lucide/vue"
import { useMediaQuery } from "@vueuse/core"
import type { GalleryImage } from "~/utils/galleryImages"

const props = defineProps<{
  open: boolean
  images: GalleryImage[]
  title: string
  startIndex: number
}>()
const emit = defineEmits<{ "update:open": [open: boolean]; closed: [index: number] }>()

const MAX_PINCH_SCALE = 4
const SWIPE_DOWN_MIN = 80
// A move larger than this is a swipe, not a tap, so it does not toggle the zoom.
const TAP_SLOP = 10

const track = useTemplateRef<HTMLUListElement>("track")
const photoButtons = useTemplateRef<HTMLButtonElement[]>("photoButtons")
const finePointer = useMediaQuery("(pointer: fine)")

const current = ref(0)
const zoomed = ref(false)
const scale = ref(1)
const origin = ref("50% 50%")

const total = computed(() => props.images.length)

// The pointer state changes on each move, so it stays out of the reactive state.
const pointers = new Map<number, { x: number; y: number }>()
let start: { x: number; y: number } | null = null
let pinchStartDistance = 0
let pinchStartScale = 1
let ignoreClick = false

function resetZoom() {
  zoomed.value = false
  scale.value = 1
  origin.value = "50% 50%"
}

function scrollToPhoto(index: number, behavior: ScrollBehavior) {
  const element = track.value
  element?.scrollTo({ left: index * element.clientWidth, behavior })
}

function go(index: number) {
  const next = Math.min(Math.max(index, 0), total.value - 1)
  if (next === current.value || next < 0) {
    return
  }
  // The focus follows the photo, so it does not stay on a slide that is out of view.
  const focusFollows = photoButtons.value?.some((button) => button === document.activeElement)
  current.value = next
  resetZoom()
  scrollToPhoto(next, "smooth")
  if (focusFollows) {
    photoButtons.value?.[next]?.focus({ preventScroll: true })
  }
}

watch(
  () => props.open,
  (open) => {
    if (open) {
      current.value = Math.min(Math.max(props.startIndex, 0), Math.max(total.value - 1, 0))
      resetZoom()
    }
  },
  { immediate: true }
)

// A swipe scrolls the track, so the scroll position gives the current photo.
function onScroll() {
  const element = track.value
  if (!element || element.clientWidth === 0 || zoomed.value) {
    return
  }
  const index = Math.round(element.scrollLeft / element.clientWidth)
  if (index !== current.value && index >= 0 && index < total.value) {
    current.value = index
  }
}

function onOpenAutoFocus(event: Event) {
  // The default focus goes to the first photo and scrolls the track back to it.
  event.preventDefault()
  scrollToPhoto(current.value, "instant")
  photoButtons.value?.[current.value]?.focus({ preventScroll: true })
}

function onCloseAutoFocus(event: Event) {
  // The page puts the focus on the gallery photo of the current index.
  event.preventDefault()
  emit("closed", current.value)
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === "ArrowLeft") {
    event.preventDefault()
    go(current.value - 1)
  } else if (event.key === "ArrowRight") {
    event.preventDefault()
    go(current.value + 1)
  }
}

function originAt(target: HTMLElement, x: number, y: number): string {
  const rect = target.getBoundingClientRect()
  if (rect.width === 0 || rect.height === 0) {
    return "50% 50%"
  }
  const percent = (value: number) => Math.round(Math.min(Math.max(value, 0), 1) * 100)
  return `${percent((x - rect.left) / rect.width)}% ${percent((y - rect.top) / rect.height)}%`
}

function onPhotoClick(event: MouseEvent, index: number) {
  if (ignoreClick) {
    ignoreClick = false
    return
  }
  if (index !== current.value) {
    current.value = index
  }
  if (zoomed.value) {
    resetZoom()
    return
  }
  const button = event.currentTarget as HTMLElement
  const image = button.querySelector("img")
  // The scale shows the photo at its full size, and at least at twice the screen size.
  const fullSize = image && image.clientWidth > 0 ? image.naturalWidth / image.clientWidth : 0
  scale.value = Math.max(fullSize, 2)
  origin.value = originAt(button, event.clientX, event.clientY)
  zoomed.value = true
}

function distance(): number {
  const [a, b] = [...pointers.values()]
  return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0
}

function onPointerDown(event: PointerEvent) {
  // Only touch pointers make a pinch. A mouse button that goes up outside the photo stays out.
  if (event.pointerType !== "touch") {
    start = { x: event.clientX, y: event.clientY }
    return
  }
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
  if (pointers.size === 1) {
    start = { x: event.clientX, y: event.clientY }
  } else if (pointers.size === 2) {
    pinchStartDistance = distance()
    pinchStartScale = scale.value
    start = null
    ignoreClick = true
  }
}

function onPointerMove(event: PointerEvent) {
  if (pointers.has(event.pointerId)) {
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
  }
  if (pointers.size === 2 && pinchStartDistance > 0) {
    const next = Math.min(
      Math.max((pinchStartScale * distance()) / pinchStartDistance, 1),
      MAX_PINCH_SCALE
    )
    scale.value = next
    zoomed.value = next > 1
    return
  }
  if (zoomed.value) {
    origin.value = originAt(event.currentTarget as HTMLElement, event.clientX, event.clientY)
  }
}

function onPointerUp(event: PointerEvent) {
  const begin = start
  pointers.delete(event.pointerId)
  if (pointers.size > 0) {
    return
  }
  start = null
  pinchStartDistance = 0
  if (!begin) {
    return
  }
  const dx = event.clientX - begin.x
  const dy = event.clientY - begin.y
  if (Math.abs(dx) > TAP_SLOP || Math.abs(dy) > TAP_SLOP) {
    ignoreClick = true
  }
  if (
    event.pointerType === "touch" &&
    !zoomed.value &&
    dy > SWIPE_DOWN_MIN &&
    Math.abs(dx) < dy / 2
  ) {
    emit("update:open", false)
  }
}

function onPointerCancel(event: PointerEvent) {
  pointers.delete(event.pointerId)
  if (pointers.size === 0) {
    start = null
    pinchStartDistance = 0
  }
}

function imageStyle(index: number) {
  if (index !== current.value || !zoomed.value) {
    return undefined
  }
  return { transform: `scale(${scale.value})`, transformOrigin: origin.value }
}
</script>

<template>
  <Dialog :open="open" @update:open="emit('update:open', $event)">
    <DialogContent
      class="inset-0 h-dvh w-full max-w-none gap-0 overflow-hidden bg-muted p-0 md:inset-0 md:h-dvh md:max-h-none md:max-w-none md:translate-x-0 md:translate-y-0 md:p-0"
      @open-auto-focus="onOpenAutoFocus"
      @close-auto-focus="onCloseAutoFocus"
      @keydown="onKeydown"
    >
      <DialogTitle class="sr-only">{{ $t("viewer.label", { title }) }}</DialogTitle>
      <div class="flex h-14 shrink-0 items-center px-4 md:h-16 md:px-6">
        <span data-testid="viewer-counter" aria-live="polite" class="text-caption tabular-nums">{{
          $t("viewer.counter", { index: current + 1, total })
        }}</span>
      </div>

      <div class="relative min-h-0 flex-1">
        <ul
          ref="track"
          class="flex h-full snap-x snap-mandatory [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          :class="zoomed ? 'touch-none overflow-hidden' : 'touch-pan-x overflow-x-auto'"
          @scroll.passive="onScroll"
        >
          <li
            v-for="(image, index) in images"
            :key="image.id"
            class="flex h-full w-full shrink-0 snap-start items-center justify-center pb-4 lg:px-24 lg:pb-6"
          >
            <button
              ref="photoButtons"
              type="button"
              class="size-full overflow-hidden outline-none focus-visible:shadow-focus"
              :class="index === current && zoomed ? 'cursor-zoom-out' : 'cursor-zoom-in'"
              :aria-label="$t(index === current && zoomed ? 'viewer.zoomOut' : 'viewer.zoomIn')"
              @click="onPhotoClick($event, index)"
              @pointerdown="onPointerDown"
              @pointermove="onPointerMove"
              @pointerup="onPointerUp"
              @pointercancel="onPointerCancel"
            >
              <img
                :src="image.url"
                alt=""
                draggable="false"
                class="size-full object-contain transition-transform duration-200 motion-reduce:transition-none"
                :style="imageStyle(index)"
              />
            </button>
          </li>
        </ul>

        <Button
          variant="ghost"
          size="icon"
          class="absolute top-1/2 left-6 hidden -translate-y-1/2 bg-background hover:bg-background lg:inline-flex"
          :aria-label="$t('viewer.previous')"
          :disabled="current === 0"
          @click="go(current - 1)"
        >
          <ChevronLeft class="size-5" :stroke-width="1.5" aria-hidden="true" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          class="absolute top-1/2 right-6 hidden -translate-y-1/2 bg-background hover:bg-background lg:inline-flex"
          :aria-label="$t('viewer.next')"
          :disabled="current >= total - 1"
          @click="go(current + 1)"
        >
          <ChevronRight class="size-5" :stroke-width="1.5" aria-hidden="true" />
        </Button>
      </div>

      <p class="shrink-0 px-4 pb-4 text-center text-caption text-muted-foreground md:pb-6">
        {{ finePointer ? $t("viewer.hintPointer") : $t("viewer.hintTouch") }}
      </p>
    </DialogContent>
  </Dialog>
</template>
