<script setup lang="ts">
import { CircleAlert, FileImage, Upload } from "@lucide/vue"
import type { UploadedReceipt } from "~/composables/useReceipts"
import type { ReceiptFileError } from "~/utils/receiptFile"

const props = defineProps<{ orderId: string }>()
const emit = defineEmits<{ uploaded: [receipt: UploadedReceipt] }>()

const { locale } = useI18n()
const { uploadReceipt } = useReceipts()

const ERROR_KEYS: Record<ReceiptFileError, string> = {
  type: "receipt.errorType",
  size: "receipt.errorSize",
}

const inputId = useId()
const hintId = useId()
const input = ref<HTMLInputElement | null>(null)

const file = ref<File | null>(null)
const fileError = ref<ReceiptFileError | null>(null)
const failed = ref(false)
const uploading = ref(false)
const dragOver = ref(false)

// A file that fails the check stays not selected, so that it never reaches the upload.
function select(candidate: File | undefined): void {
  if (!candidate) return
  failed.value = false
  fileError.value = checkReceiptFile(candidate)
  file.value = fileError.value ? null : candidate
}

function onChange(): void {
  select(input.value?.files?.[0])
  // An empty value lets the customer choose the same file again.
  if (input.value) input.value.value = ""
}

function onDrop(event: DragEvent): void {
  dragOver.value = false
  select(event.dataTransfer?.files?.[0])
}

function chooseAgain(): void {
  input.value?.click()
}

async function submit(): Promise<void> {
  if (!file.value || uploading.value) return
  failed.value = false
  uploading.value = true
  try {
    const receipt = await uploadReceipt(props.orderId, file.value)
    file.value = null
    emit("uploaded", receipt)
  } catch {
    // The customer sees no error code. The file stays, so that the customer can try again.
    failed.value = true
  } finally {
    uploading.value = false
  }
}
</script>

<template>
  <form
    novalidate
    class="flex flex-col gap-4"
    :aria-label="$t('receipt.upload')"
    @submit.prevent="submit"
  >
    <!-- The input stays in the page, so that "Change" can open it in the selected state. In that
         state the "Change" button takes the keyboard focus. -->
    <input
      :id="inputId"
      ref="input"
      type="file"
      class="peer sr-only"
      :tabindex="file ? -1 : undefined"
      :accept="RECEIPT_ACCEPT"
      :aria-describedby="hintId"
      @change="onChange"
    />

    <!-- The input is hidden, so its keyboard focus shows on the label. -->
    <div
      v-if="!file"
      class="flex flex-col gap-2 peer-focus-visible:[&_label]:shadow-[var(--focus-ring)]"
    >
      <div
        data-testid="receipt-drop"
        class="flex min-h-32 flex-col items-center justify-center gap-3 border border-dashed px-4 py-8 text-center transition-colors"
        :class="[
          fileError ? 'border-destructive' : 'border-input',
          dragOver ? 'bg-secondary' : 'bg-transparent',
        ]"
        @dragover.prevent="dragOver = true"
        @dragleave="dragOver = false"
        @drop.prevent="onDrop"
      >
        <Upload :stroke-width="1.5" aria-hidden="true" class="size-6 text-muted-foreground" />
        <p class="text-body-sm text-muted-foreground">{{ $t("receipt.drop") }}</p>
        <!-- The label opens the file input and gives the input its visible name. -->
        <Button as="label" :for="inputId" variant="outline" class="cursor-pointer">
          {{ $t("receipt.choose") }}
        </Button>
        <p :id="hintId" class="text-caption text-muted-foreground">{{ $t("receipt.formats") }}</p>
      </div>
      <FieldError v-if="fileError">{{ $t(ERROR_KEYS[fileError]) }}</FieldError>
    </div>

    <template v-else>
      <div
        class="grid grid-cols-[3.5rem_minmax(0,1fr)_auto] items-center gap-4 border border-border p-4"
      >
        <span
          aria-hidden="true"
          class="flex size-14 items-center justify-center bg-secondary text-muted-foreground"
        >
          <FileImage :stroke-width="1.5" class="size-5" />
        </span>
        <div class="flex min-w-0 flex-col gap-1">
          <p class="text-body-sm break-words" data-testid="receipt-file-name">{{ file.name }}</p>
          <p class="text-caption text-muted-foreground">
            {{ formatFileSize(file.size, locale) }}
          </p>
        </div>
        <Button
          type="button"
          variant="link"
          class="min-h-11"
          :disabled="uploading"
          @click="chooseAgain"
        >
          {{ $t("receipt.change") }}
        </Button>
      </div>

      <Alert v-if="failed" variant="destructive">
        <CircleAlert :stroke-width="1.5" aria-hidden="true" />
        <AlertDescription>{{ $t("receipt.errorFailed") }}</AlertDescription>
      </Alert>

      <Button type="submit" class="w-full" :loading="uploading">
        {{ uploading ? $t("receipt.uploading") : $t("receipt.upload") }}
      </Button>
    </template>
  </form>
</template>
