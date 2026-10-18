<script setup lang="ts">
import type { NuxtError } from "#app"
import { ArrowRight, Compass } from "@lucide/vue"

const props = defineProps<{ error: NuxtError }>()

const { t } = useI18n()
const localePath = useLocalePath()

// Only a 404 shows the category links. A 500 can mean that the backend is down, so it makes no
// catalog request.
const notFound = props.error.statusCode === 404
const { categories } = notFound ? useNavCategories() : { categories: computed(() => []) }

const title = computed(() => t(notFound ? "error.notFound.title" : "error.server.title"))

// The page never shows the status code or the statusMessage of Nuxt. That text is in English
// only and can show the address.
const body = computed(() => {
  const messageKey = (props.error.data as { messageKey?: unknown } | undefined)?.messageKey
  if (typeof messageKey === "string") return t(messageKey)
  return t(notFound ? "error.notFound.body" : "error.server.body")
})

// The design shows the last word of the title in italics.
const titleParts = computed(() => {
  const split = title.value.lastIndexOf(" ")
  return split === -1
    ? { start: "", end: title.value }
    : { start: title.value.slice(0, split + 1), end: title.value.slice(split + 1) }
})

useHead({ title })

const leave = (path: string) => clearError({ redirect: localePath(path) })
</script>

<template>
  <!-- Nuxt renders error.vue outside the layout. NuxtLayout keeps the header and the footer. -->
  <NuxtLayout>
    <section class="pt-16 pb-16 md:pt-32 md:pb-24" aria-labelledby="error-title">
      <div class="mx-auto flex max-w-[720px] flex-col items-center gap-4 text-center md:gap-6">
        <EmptyMedia shape="circle">
          <Compass :size="24" :stroke-width="1.5" aria-hidden="true" />
        </EmptyMedia>
        <h1 id="error-title" class="text-display">
          {{ titleParts.start }}<em class="italic">{{ titleParts.end }}</em>
        </h1>
        <p class="max-w-[60ch] text-body-lg text-muted-foreground" data-testid="error-body">
          {{ body }}
        </p>
        <div
          class="mt-2 flex w-full flex-col items-stretch gap-4 md:mt-4 md:w-auto md:flex-row md:items-center md:justify-center"
        >
          <Button data-testid="error-home" @click="leave('/')">{{ t("error.home") }}</Button>
          <Button variant="outline" data-testid="error-browse" @click="leave('/products')">
            {{ t("error.browse") }}
          </Button>
        </div>
      </div>
    </section>

    <section v-if="notFound" class="pb-16 md:pb-24" aria-labelledby="error-categories-title">
      <div class="border-t border-border pt-8 md:pt-12">
        <p id="error-categories-title" class="text-eyebrow">{{ t("error.categories") }}</p>
        <nav
          class="mt-2 grid grid-cols-1 gap-x-8 md:mt-6 md:grid-cols-3"
          aria-labelledby="error-categories-title"
        >
          <NuxtLinkLocale
            v-for="category in categories"
            :key="category.id"
            :to="`/categories/${category.handle}`"
            class="flex min-h-14 items-center justify-between border-b border-border text-nav hover:text-muted-foreground focus-visible:shadow-[var(--focus-ring)] focus-visible:outline-none"
          >
            {{ category.name }}
            <ArrowRight :size="18" :stroke-width="1.5" aria-hidden="true" />
          </NuxtLinkLocale>
        </nav>
      </div>
    </section>
  </NuxtLayout>
</template>
