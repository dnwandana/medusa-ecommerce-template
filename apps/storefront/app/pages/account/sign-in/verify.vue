<script setup lang="ts">
import { CircleAlert, CircleCheck, ShieldCheck } from "@lucide/vue"

type VerifyState =
  "checking" | "signed-in" | "signed-in-here" | "confirm" | "confirming" | "done" | "invalid"

const CLOSE_AFTER_MS = 5000
// The time that the browser gets to close the tab before the page shows the manual text.
const CLOSE_CHECK_MS = 500

const { t, locale } = useI18n()
const route = useRoute()
const localePath = useLocalePath()
// This page does not poll, so the flow never calls onSignedIn.
const flow = useMagicLink({ onSignedIn: () => {} })

const state = ref<VerifyState>("checking")
const closeFailed = ref(false)
const nextPath = ref("/account")
const request = ref<{ browser: string; time: string } | null>(null)

let closeTimer: ReturnType<typeof setTimeout> | undefined
let checkTimer: ReturnType<typeof setTimeout> | undefined
let requestId = ""
let linkToken = ""

// Returns the request time in Western Indonesian Time, for example "14:32 WIB".
function formatRequestTime(iso: string, localeCode: string): string {
  const time = new Intl.DateTimeFormat(localeCode, {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(new Date(iso))
  return `${time} WIB`
}

// A browser closes a tab by script only when the tab has one page in its history. Thus the page
// does not change its URL before the close.
function startCloseTimer(): void {
  closeTimer = setTimeout(() => {
    window.close()
    checkTimer = setTimeout(() => {
      closeFailed.value = true
    }, CLOSE_CHECK_MS)
  }, CLOSE_AFTER_MS)
}

function queryValue(value: unknown): string {
  return typeof value === "string" ? value : ""
}

async function verify(): Promise<void> {
  requestId = queryValue(route.query.id)
  linkToken = queryValue(route.query.token)
  if (!requestId || !linkToken) {
    state.value = "invalid"
    return
  }

  try {
    const path = await flow.sessionFromLink(requestId, linkToken)
    if (path !== null) {
      // The same browser asked for the link. The original tab closes this tab when it answers.
      if (await announceSignIn(requestId)) {
        state.value = "signed-in"
        startCloseTimer()
      } else {
        nextPath.value = path
        state.value = "signed-in-here"
      }
      return
    }

    // Another device asked for the link. This device gets no session.
    const details = await flow.checkLink(requestId, linkToken)
    if (!details) {
      state.value = "invalid"
      return
    }
    request.value = {
      browser: details.browser,
      time: formatRequestTime(details.requested_at, locale.value),
    }
    state.value = "confirm"
  } catch {
    state.value = "invalid"
  }
}

async function confirm(): Promise<void> {
  state.value = "confirming"
  try {
    if (await flow.confirmLink(requestId, linkToken)) {
      state.value = "done"
      startCloseTimer()
    } else {
      state.value = "invalid"
    }
  } catch {
    state.value = "invalid"
  }
}

function continueHere(): void {
  void navigateTo(localePath(nextPath.value))
}

onMounted(() => {
  void verify()
})

onBeforeUnmount(() => {
  clearTimeout(closeTimer)
  clearTimeout(checkTimer)
})

useHead({ title: () => t("auth.signIn.title") })
useSeoMeta({ robots: "noindex" })
</script>

<template>
  <section class="mx-auto w-full max-w-[400px] pt-10 pb-16 md:pt-24 md:pb-32">
    <div class="flex flex-col gap-8 md:gap-10">
      <div
        v-if="state === 'checking'"
        role="status"
        class="flex flex-col items-center gap-4 text-center"
      >
        <EmptyMedia shape="disc" class="mb-2">
          <Spinner class="size-[26px]" />
        </EmptyMedia>
        <h1 class="text-h1">{{ $t("auth.verify.checkingTitle") }}</h1>
        <p class="text-body-sm text-muted-foreground">{{ $t("auth.verify.checkingBody") }}</p>
      </div>

      <template v-else-if="state === 'signed-in' || state === 'signed-in-here'">
        <div role="status" class="flex flex-col items-center gap-4 text-center">
          <EmptyMedia shape="disc" tone="success" class="mb-2">
            <CircleCheck :size="26" :stroke-width="1.5" aria-hidden="true" />
          </EmptyMedia>
          <h1 class="text-h1">{{ $t("auth.verify.signedInTitle") }}</h1>
          <p v-if="state === 'signed-in'" class="text-body-sm text-muted-foreground">
            {{ closeFailed ? $t("auth.verify.closeTab") : $t("auth.verify.closesSoon") }}
          </p>
        </div>
        <Button
          v-if="state === 'signed-in-here'"
          type="button"
          class="w-full"
          data-testid="continue"
          @click="continueHere"
        >
          {{ $t("auth.verify.continue") }}
        </Button>
      </template>

      <template v-else-if="state === 'confirm' || state === 'confirming'">
        <div class="flex flex-col items-center gap-4 text-center">
          <EmptyMedia class="mb-2">
            <ShieldCheck :size="26" :stroke-width="1.5" aria-hidden="true" />
          </EmptyMedia>
          <h1 class="text-h1">{{ $t("auth.verify.confirmTitle") }}</h1>
          <p class="text-body-sm text-muted-foreground">{{ $t("auth.verify.confirmIntro") }}</p>
        </div>

        <dl v-if="request" class="border-t border-border text-body-sm">
          <div class="flex items-baseline justify-between gap-4 border-b border-border py-3">
            <dt class="text-field-label text-muted-foreground uppercase">
              {{ $t("auth.verify.browser") }}
            </dt>
            <dd class="text-right [overflow-wrap:anywhere]">{{ request.browser }}</dd>
          </div>
          <div class="flex items-baseline justify-between gap-4 border-b border-border py-3">
            <dt class="text-field-label text-muted-foreground uppercase">
              {{ $t("auth.verify.time") }}
            </dt>
            <dd class="text-right">{{ request.time }}</dd>
          </div>
        </dl>

        <div class="flex flex-col items-center gap-4 text-center">
          <Button
            type="button"
            class="w-full"
            data-testid="confirm"
            :loading="state === 'confirming'"
            @click="confirm"
          >
            {{ state === "confirming" ? $t("auth.verify.confirming") : $t("auth.verify.confirm") }}
          </Button>
          <p class="text-body-sm text-muted-foreground">{{ $t("auth.verify.confirmNote") }}</p>
        </div>
      </template>

      <div
        v-else-if="state === 'done'"
        role="status"
        class="flex flex-col items-center gap-4 text-center"
      >
        <EmptyMedia shape="disc" tone="success" class="mb-2">
          <CircleCheck :size="26" :stroke-width="1.5" aria-hidden="true" />
        </EmptyMedia>
        <h1 class="text-h1">{{ $t("auth.verify.doneTitle") }}</h1>
        <p class="text-body-sm text-muted-foreground">
          {{ closeFailed ? $t("auth.verify.closeTab") : $t("auth.verify.doneBody") }}
        </p>
      </div>

      <template v-else>
        <div role="alert" class="flex flex-col items-center gap-4 text-center">
          <EmptyMedia shape="disc" tone="destructive" class="mb-2">
            <CircleAlert :size="26" :stroke-width="1.5" aria-hidden="true" />
          </EmptyMedia>
          <h1 class="text-h1">{{ $t("auth.verify.invalidTitle") }}</h1>
          <p class="text-body-sm text-muted-foreground">{{ $t("auth.verify.invalidBody") }}</p>
        </div>
        <Button class="w-full" as-child>
          <NuxtLinkLocale to="/account/sign-in">
            {{ $t("auth.verify.signInAgain") }}
          </NuxtLinkLocale>
        </Button>
      </template>
    </div>
  </section>
</template>
