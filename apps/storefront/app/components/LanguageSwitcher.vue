<script setup lang="ts">
// setLocale writes the cookie. The return page from Mayar needs the cookie to know the language.
const { locale, locales, setLocale } = useI18n()
</script>

<template>
  <nav :aria-label="$t('nav.language')" class="flex gap-1">
    <button
      v-for="item in locales"
      :key="item.code"
      type="button"
      class="rounded px-2 py-1 text-sm hover:bg-accent"
      :class="item.code === locale ? 'font-semibold' : 'font-normal text-muted-foreground'"
      :aria-current="item.code === locale ? 'true' : undefined"
      @click="setLocale(item.code)"
    >
      {{ item.name }}
    </button>
  </nav>
</template>
