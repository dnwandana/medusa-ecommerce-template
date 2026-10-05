<script setup lang="ts">
import type { ReviewableItem } from "~/composables/useReviews"
import type { ReviewInput } from "~/utils/reviewForm"

const props = defineProps<{ item: ReviewableItem }>()
const emit = defineEmits<{ submitted: [] }>()

const { submit: sendReview } = useReviews()

const rating = ref(0)
const title = ref("")
const content = ref("")
const errors = ref<{ rating?: string; content?: string }>({})
// A message key of the group reviews.errors, or null.
const failure = ref<string | null>(null)
const busy = ref(false)
const done = ref(false)

// The IDs connect each label to its field. One page can show many forms.
const idPrefix = `review-${props.item.order_line_item_id}`

// Checks the form and sends the review.
async function submit(): Promise<void> {
  failure.value = null
  errors.value = validateReviewInput({ rating: rating.value, content: content.value })
  if (Object.keys(errors.value).length > 0) {
    return
  }

  const input: ReviewInput = {
    order_line_item_id: props.item.order_line_item_id,
    rating: rating.value,
    content: content.value.trim(),
  }
  const cleanTitle = title.value.trim()
  if (cleanTitle) {
    input.title = cleanTitle
  }

  busy.value = true
  try {
    await sendReview(input)
    done.value = true
    emit("submitted")
  } catch (error) {
    failure.value = reviewErrorKey(error)
  } finally {
    busy.value = false
  }
}
</script>

<template>
  <p v-if="done" role="status" class="text-sm">{{ $t("reviews.submitted") }}</p>

  <form v-else novalidate class="flex flex-col gap-3" @submit.prevent="submit">
    <h3 class="font-medium">
      {{ $t("reviews.write") }}: {{ item.product_title }}
      <span v-if="item.variant_title" class="text-muted-foreground">({{ item.variant_title }})</span>
    </h3>

    <fieldset class="flex flex-col gap-1">
      <legend class="text-sm font-medium">{{ $t("reviews.rating") }}</legend>
      <div class="flex gap-3">
        <label v-for="n in 5" :key="n" class="flex items-center gap-1 text-sm">
          <input v-model.number="rating" type="radio" name="rating" :value="n" />
          {{ n }}
        </label>
      </div>
    </fieldset>
    <p v-if="errors.rating" role="alert" class="text-sm text-destructive">
      {{ $t(errors.rating) }}
    </p>

    <div class="flex flex-col gap-1">
      <Label :for="`${idPrefix}-title`">{{ $t("reviews.reviewTitle") }}</Label>
      <Input :id="`${idPrefix}-title`" v-model="title" name="title" />
    </div>

    <div class="flex flex-col gap-1">
      <Label :for="`${idPrefix}-content`">{{ $t("reviews.content") }}</Label>
      <Textarea :id="`${idPrefix}-content`" v-model="content" name="content" />
    </div>
    <p v-if="errors.content" role="alert" class="text-sm text-destructive">
      {{ $t(errors.content) }}
    </p>

    <p v-if="failure" role="alert" class="text-sm text-destructive">{{ $t(failure) }}</p>

    <div>
      <Button type="submit" :disabled="busy">{{ $t("reviews.submit") }}</Button>
    </div>
  </form>
</template>
