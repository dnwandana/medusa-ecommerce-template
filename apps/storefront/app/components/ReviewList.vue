<script setup lang="ts">
import { toast } from "vue-sonner"
import type { Review } from "~/composables/useReviews"
import { relativeTime } from "~/utils/relativeTime"

const props = defineProps<{ productId: string }>()

const reviews = useReviews()
const { t, locale } = useI18n()

// The product page loads the first page before the render, so the list uses that result and
// sends no request. With no page before it, the list loads the reviews after the render.
const { data, error } = useFirstReviewPage(props.productId, { lazy: true })

// The list starts from the first page. "Show more reviews" adds the next reviews to it.
const list = ref<Review[]>([])
watch(
  () => data.value?.reviews,
  (first) => {
    list.value = [...(first ?? [])]
  },
  { immediate: true }
)

const count = computed(() => data.value?.count ?? 0)
const hasMore = computed(() => list.value.length < count.value)
const loadingMore = ref(false)

async function showMore(): Promise<void> {
  // A second click while the request runs does nothing.
  if (loadingMore.value) {
    return
  }
  loadingMore.value = true
  try {
    const next = await reviews.listForProduct(props.productId, {
      limit: REVIEW_MORE_COUNT,
      offset: list.value.length,
    })
    list.value = [...list.value, ...next.reviews]
  } catch {
    toast.error(t("common.error"))
  } finally {
    loadingMore.value = false
  }
}

function byline(review: Review): string {
  const name = review.first_name ?? ""
  return review.size ? t("reviews.byline", { name, size: review.size }) : name
}
</script>

<template>
  <!-- tabindex -1: the rating link of the product page moves the focus here with no outline. -->
  <section
    id="reviews"
    aria-labelledby="reviews-title"
    tabindex="-1"
    class="scroll-mt-24 outline-none"
  >
    <div
      v-if="error || data?.count === 0"
      class="flex flex-col gap-6 border-t border-border pt-8 md:pt-16"
    >
      <h2 id="reviews-title" class="text-h2">{{ $t("reviews.title") }}</h2>
      <Alert v-if="error" variant="destructive">
        <AlertDescription>{{ $t("common.error") }}</AlertDescription>
      </Alert>
      <p v-else class="text-body text-muted-foreground">{{ $t("reviews.empty") }}</p>
    </div>

    <div
      v-else
      class="grid gap-y-6 border-t border-border pt-8 md:pt-16 lg:grid-cols-11 lg:gap-x-24 lg:gap-y-12"
      :aria-busy="data ? undefined : 'true'"
    >
      <!-- The summary stays in view while the list scrolls, from 1024 px only. -->
      <div class="flex flex-col gap-6 lg:sticky lg:top-24 lg:col-span-4 lg:self-start">
        <h2 id="reviews-title" class="text-h2">{{ $t("reviews.title") }}</h2>
        <div v-if="data" class="flex items-baseline gap-4">
          <p
            v-if="typeof data.average_rating === 'number'"
            data-testid="review-average"
            class="font-heading text-[40px] leading-10 tabular-nums md:text-[64px] md:leading-[64px]"
          >
            {{ data.average_rating.toFixed(1) }}
          </p>
          <div class="flex flex-col gap-1">
            <StarRating
              v-if="typeof data.average_rating === 'number'"
              :rating="data.average_rating"
              size="md"
            />
            <span class="text-caption text-muted-foreground">{{
              $t("reviews.basedOn", { count: data.count }, data.count)
            }}</span>
          </div>
        </div>
        <div v-else class="flex flex-col gap-4" aria-hidden="true">
          <Skeleton class="h-16 w-40" />
          <Skeleton class="h-4 w-48" />
        </div>
      </div>

      <div class="flex flex-col lg:col-span-7">
        <template v-if="data">
          <article
            v-for="review in list"
            :key="review.id"
            class="flex flex-col gap-2.5 border-b border-border py-6 md:py-8"
          >
            <div class="flex items-start justify-between gap-4">
              <h3 v-if="review.title" class="text-h4">{{ review.title }}</h3>
              <time
                :datetime="review.created_at"
                class="ml-auto shrink-0 text-caption text-muted-foreground"
              >
                {{ relativeTime(review.created_at, locale) }}
              </time>
            </div>
            <StarRating :rating="review.rating" size="sm" />
            <p class="max-w-[640px] text-body whitespace-pre-line">{{ review.content }}</p>
            <p data-testid="review-byline" class="text-caption text-muted-foreground">
              {{ byline(review) }}
            </p>
          </article>
          <Button
            v-if="hasMore"
            type="button"
            variant="outline"
            class="mt-6 w-full md:mt-8 lg:w-auto lg:self-start"
            :aria-busy="loadingMore ? 'true' : undefined"
            @click="showMore"
          >
            <Spinner v-if="loadingMore" />
            {{ $t("reviews.showMore") }}
          </Button>
        </template>
        <template v-else>
          <div
            v-for="n in REVIEW_FIRST_COUNT"
            :key="n"
            data-testid="review-skeleton"
            class="flex flex-col gap-2.5 border-b border-border py-6 md:py-8"
            aria-hidden="true"
          >
            <Skeleton class="h-3.5 w-24" />
            <Skeleton class="h-6 w-1/2" />
            <Skeleton class="h-4 w-full" />
            <Skeleton class="h-4 w-2/3" />
          </div>
        </template>
      </div>
    </div>
  </section>
</template>
