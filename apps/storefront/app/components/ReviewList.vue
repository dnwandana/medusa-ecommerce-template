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
</script>

<template>
  <section class="space-y-4">
    <h2 class="text-xl font-semibold">{{ $t("reviews.title") }}</h2>

    <p v-if="error" class="text-sm text-red-600">{{ $t("common.error") }}</p>

    <template v-else-if="data">
      <p v-if="data.count === 0" class="text-sm text-neutral-600">{{ $t("reviews.empty") }}</p>

      <template v-else>
        <div class="flex flex-wrap items-center gap-2">
          <template v-if="typeof data.average_rating === 'number'">
            <StarRating :rating="data.average_rating" />
            <span class="font-medium">
              {{ $t("reviews.average", { rating: data.average_rating.toFixed(1) }) }}
            </span>
          </template>
          <span class="text-sm text-neutral-600">{{ $t("reviews.count", data.count) }}</span>
        </div>

        <div>
          <template v-for="(review, index) in data.reviews" :key="review.id">
            <Separator v-if="index > 0" class="my-4" />
            <article class="space-y-1">
              <StarRating :rating="review.rating" />
              <h3 v-if="review.title" class="font-medium">{{ review.title }}</h3>
              <p class="whitespace-pre-line">{{ review.content }}</p>
              <p class="text-sm text-neutral-600">
                {{ review.first_name }} · {{ review.created_at.slice(0, 10) }}
              </p>
            </article>
          </template>
        </div>

        <div v-if="page > 1 || hasNext" class="flex gap-2">
          <Button v-if="page > 1" type="button" variant="outline" @click="page--">
            {{ $t("common.previous") }}
          </Button>
          <Button v-if="hasNext" type="button" variant="outline" @click="page++">
            {{ $t("common.next") }}
          </Button>
        </div>
      </template>
    </template>
  </section>
</template>
