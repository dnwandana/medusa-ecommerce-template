<script setup lang="ts">
import type { AcceptableValue } from "reka-ui"
import { Languages } from "@lucide/vue"

const { variant = "header" } = defineProps<{ variant?: "header" | "sheet" }>()

// setLocale writes the cookie. The return page from Mayar needs the cookie to know the language.
const { locale, locales, setLocale } = useI18n()

const current = computed(() => locales.value.find((item) => item.code === locale.value))

// The radio group emits an AcceptableValue. The menu lists only the configured locale codes.
const choose = (code: AcceptableValue) => setLocale(code as typeof locale.value)
</script>

<template>
  <DropdownMenu>
    <DropdownMenuTrigger as-child>
      <!-- "EN" alone does not name the control, so the header button has an aria-label. -->
      <Button v-if="variant === 'header'" variant="ghost" size="sm" :aria-label="$t('nav.language')">
        <Languages aria-hidden="true" />
        {{ locale.toUpperCase() }}
      </Button>
      <Button v-else variant="outline" class="w-full justify-start">
        <Languages aria-hidden="true" />
        {{ current?.name }}
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuLabel>{{ $t("nav.language") }}</DropdownMenuLabel>
      <DropdownMenuRadioGroup
        :model-value="locale"
        @update:model-value="choose"
      >
        <DropdownMenuRadioItem v-for="item in locales" :key="item.code" :value="item.code">
          {{ item.name }}
        </DropdownMenuRadioItem>
      </DropdownMenuRadioGroup>
    </DropdownMenuContent>
  </DropdownMenu>
</template>
