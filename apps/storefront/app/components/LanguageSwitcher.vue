<script setup lang="ts">
import type { AcceptableValue } from "reka-ui"
import { Globe, Languages } from "@lucide/vue"

const { variant = "header" } = defineProps<{ variant?: "header" | "footer" | "sheet" }>()

// setLocale writes the cookie. The return page from a payment gateway needs the cookie to know the
// language.
const { locale, locales, setLocale, t } = useI18n()

// The names come from the locale files, so each locale can name the languages in its own words.
const languageName = (code: string) => t(`nav.languageNames.${code}`)
const code = computed(() => locale.value.toUpperCase())

// The radio group emits an AcceptableValue. The menu lists only the configured locale codes.
const choose = (code: AcceptableValue) => setLocale(code as typeof locale.value)
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <!-- "EN" alone does not name the control, so the header button has an aria-label. -->
      <Button
        v-if="variant === 'header'"
        variant="ghost"
        class="h-11 px-3 text-nav"
        :aria-label="t('nav.language')"
      >
        {{ code }}
      </Button>
      <Button v-else-if="variant === 'footer'" variant="link" class="min-h-11">
        <Globe :stroke-width="1.5" aria-hidden="true" />
        {{ `${code} · ${languageName(locale)}` }}
      </Button>
      <Button v-else variant="outline" class="w-full justify-start">
        <Languages :stroke-width="1.5" aria-hidden="true" />
        {{ languageName(locale) }}
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuLabel>{{ t("nav.language") }}</DropdownMenuLabel>
      <DropdownMenuRadioGroup :model-value="locale" @update:model-value="choose">
        <DropdownMenuRadioItem v-for="item in locales" :key="item.code" :value="item.code">
          {{ languageName(item.code) }}
        </DropdownMenuRadioItem>
      </DropdownMenuRadioGroup>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
