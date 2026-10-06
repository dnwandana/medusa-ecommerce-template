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
  <Alert v-if="done" variant="success">
    <AlertDescription>{{ $t("reviews.submitted") }}</AlertDescription>
  </Alert>

  <!-- The Collapsible trigger of the orders page names the item, so the form has no heading. -->
  <form v-else novalidate class="flex flex-col gap-5" @submit.prevent="submit">
    <fieldset class="flex flex-col gap-1">
      <legend class="mb-1 text-body-sm font-semibold">{{ $t("reviews.rating") }}</legend>
      <StarRating v-model="rating" mode="input" name="rating" />
      <FieldError v-if="errors.rating">{{ $t(errors.rating) }}</FieldError>
    </fieldset>

    <Field>
      <FieldLabel :for="`${idPrefix}-title`">{{ $t("reviews.reviewTitle") }}</FieldLabel>
      <Input :id="`${idPrefix}-title`" v-model="title" name="title" />
    </Field>

    <Field>
      <FieldLabel :for="`${idPrefix}-content`">{{ $t("reviews.content") }}</FieldLabel>
      <Textarea :id="`${idPrefix}-content`" v-model="content" name="content" />
      <FieldError v-if="errors.content">{{ $t(errors.content) }}</FieldError>
    </Field>

    <Alert v-if="failure" variant="destructive">
      <AlertDescription>{{ $t(failure) }}</AlertDescription>
    </Alert>

    <div>
      <Button type="submit" :disabled="busy">
        <Spinner v-if="busy" />
        {{ $t("reviews.submit") }}
      </Button>
    </div>
  </form>
</template>
