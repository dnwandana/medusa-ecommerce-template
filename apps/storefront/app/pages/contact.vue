<script setup lang="ts">
import { Mail, MessageCircle } from "@lucide/vue"

const { t } = useI18n()
const { getDetails } = useBankTransfer()

// A failed request leaves data empty. The page then shows the unavailable text.
const { data } = await useAsyncData("store-contact", () => getDetails())

// wa.me takes the number as digits only, with the country code.
const whatsappDigits = (value: string): string => value.replace(/[^\d]/g, "")

const rows = computed(() => {
  const contact = data.value?.contact
  const list: { key: string; icon: typeof Mail; label: string; href: string; text: string }[] = []
  if (contact?.whatsapp) {
    list.push({
      key: "whatsapp",
      icon: MessageCircle,
      label: t("pages.contact.whatsapp"),
      href: `https://wa.me/${whatsappDigits(contact.whatsapp)}`,
      text: contact.whatsapp,
    })
  }
  if (contact?.email) {
    list.push({
      key: "email",
      icon: Mail,
      label: t("pages.contact.email"),
      href: `mailto:${contact.email}`,
      text: contact.email,
    })
  }
  return list
})

useHead({ title: () => t("pages.contact.title") })
</script>

<template>
  <article class="mx-auto max-w-[720px] pt-10 pb-16 md:pt-16 md:pb-24">
    <header>
      <h1 class="text-h1">{{ t("pages.contact.title") }}</h1>
      <p class="mt-4 text-body-lg text-muted-foreground">{{ t("pages.contact.intro") }}</p>
    </header>
    <ul v-if="rows.length" class="mt-16 divide-y divide-border border-y border-border">
      <li
        v-for="row in rows"
        :key="row.key"
        class="flex flex-wrap items-center gap-x-4 gap-y-1 py-4"
        :data-testid="`contact-${row.key}`"
      >
        <component :is="row.icon" class="size-5 shrink-0" aria-hidden="true" />
        <span class="w-24 text-field-label text-muted-foreground">{{ row.label }}</span>
        <!-- The link text is the value itself, so a viewer with no mail app can copy it. -->
        <a
          :href="row.href"
          class="inline-flex min-h-11 items-center text-body break-all underline underline-offset-4 hover:text-muted-foreground"
          :target="row.key === 'whatsapp' ? '_blank' : undefined"
          :rel="row.key === 'whatsapp' ? 'noopener noreferrer' : undefined"
          >{{ row.text }}</a
        >
      </li>
    </ul>
    <Alert v-else class="mt-16">
      <AlertDescription>{{ t("pages.contact.unavailable") }}</AlertDescription>
    </Alert>
  </article>
</template>
