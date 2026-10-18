<script setup lang="ts">
import { CircleAlert, CircleCheck, Clock, Mail } from "@lucide/vue"

const props = defineProps<{
  email: string
  phase: "waiting" | "expired"
  resendAt: number | null
  sentAgain: boolean
  busy: boolean
  // The text of a failed resend. An empty text shows no box.
  error?: string
}>()

const emit = defineEmits<{
  resend: []
  "different-email": []
}>()

const { t } = useI18n()

// The clock of the countdown. The interval runs only while the component is on the page.
const now = ref(Date.now())
let timer: ReturnType<typeof setInterval> | undefined

onMounted(() => {
  now.value = Date.now()
  timer = setInterval(() => {
    now.value = Date.now()
  }, 1000)
})

onBeforeUnmount(() => {
  clearInterval(timer)
  timer = undefined
})

const secondsLeft = computed(() =>
  props.resendAt === null ? 0 : Math.max(0, Math.ceil((props.resendAt - now.value) / 1000))
)

const resendLabel = computed(() => {
  if (secondsLeft.value === 0) {
    return t("auth.check.resend")
  }
  const minutes = Math.floor(secondsLeft.value / 60)
  const seconds = String(secondsLeft.value % 60).padStart(2, "0")
  return t("auth.check.resendIn", { time: `${minutes}:${seconds}` })
})
</script>

<template>
  <div class="flex flex-col gap-8 md:gap-10">
    <template v-if="phase === 'waiting'">
      <div class="flex flex-col items-center gap-4 text-center">
        <EmptyMedia shape="disc" tone="success" class="mb-2">
          <Mail :size="26" :stroke-width="1.5" aria-hidden="true" />
        </EmptyMedia>
        <h1 class="text-h1">{{ $t("auth.check.title") }}</h1>
        <i18n-t
          keypath="auth.check.sentTo"
          tag="p"
          scope="global"
          class="text-body-sm text-muted-foreground"
        >
          <template #email>
            <b class="font-semibold text-foreground">{{ email }}</b>
          </template>
        </i18n-t>
      </div>

      <Alert v-if="sentAgain" variant="success">
        <CircleCheck :stroke-width="1.5" aria-hidden="true" />
        <AlertDescription>{{ $t("auth.check.sentAgain") }}</AlertDescription>
      </Alert>

      <Alert v-if="error" variant="warning">
        <CircleAlert :stroke-width="1.5" aria-hidden="true" />
        <AlertDescription>{{ error }}</AlertDescription>
      </Alert>

      <p
        role="status"
        class="flex items-center justify-center gap-2.5 text-body-sm text-muted-foreground"
      >
        <Spinner />
        {{ $t("auth.check.waiting") }}
      </p>

      <div class="flex flex-col items-center gap-4 text-center">
        <Button
          type="button"
          variant="outline"
          class="w-full"
          data-testid="resend"
          :disabled="secondsLeft > 0"
          :loading="busy"
          @click="emit('resend')"
        >
          {{ resendLabel }}
        </Button>
        <Button
          type="button"
          variant="link"
          class="min-h-11"
          data-testid="different-email"
          @click="emit('different-email')"
        >
          {{ $t("auth.check.differentEmail") }}
        </Button>
        <p class="text-caption text-muted-foreground">{{ $t("auth.check.spam") }}</p>
      </div>
    </template>

    <template v-else>
      <div class="flex flex-col items-center gap-4 text-center">
        <EmptyMedia shape="disc" tone="warning" class="mb-2">
          <Clock :size="26" :stroke-width="1.5" aria-hidden="true" />
        </EmptyMedia>
        <h1 class="text-h1">{{ $t("auth.check.expiredTitle") }}</h1>
        <p class="text-body-sm text-muted-foreground">{{ $t("auth.check.expiredBody") }}</p>
      </div>

      <Alert v-if="error" variant="warning">
        <CircleAlert :stroke-width="1.5" aria-hidden="true" />
        <AlertDescription>{{ error }}</AlertDescription>
      </Alert>

      <div class="flex flex-col items-center gap-4 text-center">
        <Button
          type="button"
          class="w-full"
          data-testid="send-new"
          :loading="busy"
          @click="emit('resend')"
        >
          {{ $t("auth.check.sendNew") }}
        </Button>
        <Button
          type="button"
          variant="link"
          class="min-h-11"
          data-testid="different-email"
          @click="emit('different-email')"
        >
          {{ $t("auth.check.differentEmail") }}
        </Button>
      </div>
    </template>
  </div>
</template>
