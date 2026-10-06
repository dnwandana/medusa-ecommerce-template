<script setup lang="ts">
const props = defineProps<{ productId: string }>()

const reviews = useReviews()
const page = ref(1)

const { data, error } = await useAsyncData(
  () => `reviews:${props.productId}:${page.value}`,
  () =>
    reviews.listForProduct(props.productId, {
      limit: REVIEW_PAGE_SIZE,
      offset: (page.value - 1) * REVIEW_PAGE_SIZE,
    })
)

const hasNext = computed(() => page.value * REVIEW_PAGE_SIZE < (data.value?.count ?? 0))

// Returns the upper-case first letters of the first name and the last name, for example "SD".
// The text shows only the first name. The initials give one letter of the last name, as in the mockup.
function initials(first: string | null | undefined, last: string | null | undefined): string {
  return [first, last]
    .map((name) => name?.trim().charAt(0) ?? "")
    .join("")
    .toUpperCase()
}
</script>

<template>
  <section class="flex flex-col gap-6">
    <h2 class="text-h2">{{ $t("reviews.title") }}</h2>

    <Alert v-if="error" variant="destructive">
      <AlertDescription>{{ $t("common.error") }}</AlertDescription>
    </Alert>

    <template v-else-if="data">
      <p v-if="data.count === 0" class="text-muted-foreground">{{ $t("reviews.empty") }}</p>

      <template v-else>
        <div class="flex flex-wrap items-center gap-2">
          <template v-if="typeof data.average_rating === 'number'">
            <StarRating :rating="data.average_rating" />
            <span class="font-semibold">
              {{ $t("reviews.average", { rating: data.average_rating.toFixed(1) }) }}
            </span>
          </template>
          <span class="text-body-sm text-muted-foreground">{{ $t("reviews.count", data.count) }}</span>
        </div>

        <div class="flex flex-col gap-6">
          <template v-for="(review, index) in data.reviews" :key="review.id">
            <Separator v-if="index > 0" />
            <article class="flex gap-4">
              <Avatar>
                <AvatarFallback>{{ initials(review.first_name, review.last_name) }}</AvatarFallback>
              </Avatar>
              <div class="flex min-w-0 flex-col gap-1">
                <p class="font-semibold">{{ review.first_name }}</p>
                <StarRating :rating="review.rating" />
                <p class="text-caption text-muted-foreground">{{ review.created_at.slice(0, 10) }}</p>
                <h3 v-if="review.title" class="mt-1 text-h4">{{ review.title }}</h3>
                <p class="whitespace-pre-line">{{ review.content }}</p>
              </div>
            </article>
          </template>
        </div>

        <div v-if="page > 1 || hasNext" class="flex gap-2">
          <Button v-if="page > 1" type="button" variant="outline" size="sm" @click="page--">
            {{ $t("common.previous") }}
          </Button>
          <Button v-if="hasNext" type="button" variant="outline" size="sm" @click="page++">
            {{ $t("common.next") }}
          </Button>
        </div>
      </template>
    </template>
  </section>
</template>
