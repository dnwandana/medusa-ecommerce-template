<script setup lang="ts">
import { Mail, MapPin, MessageCircle, Phone } from "@lucide/vue"
import { whatsappHref } from "~/utils/orderNotices"
import { socialNetwork } from "~/utils/socialNetworks"

const { t } = useI18n()
const { ensureSettings } = useStorefront()

// The home page and the order page use the same key and the same handler, so the pages share
// the data.
// A failed request leaves data empty. The page then shows the unavailable text.
const { data } = await useAsyncData("store-contact", async () => (await ensureSettings()).contact)

// The address has no href, because no link opens an address.
const rows = computed(() => {
  const contact = data.value
  const list: { key: string; icon: typeof Mail; label: string; href?: string; text: string }[] = []
  if (contact?.whatsapp) {
    list.push({
      key: "whatsapp",
      icon: MessageCircle,
      label: t("pages.contact.whatsapp"),
      href: whatsappHref(contact.whatsapp) ?? undefined,
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
  if (contact?.phone) {
    list.push({
      key: "phone",
      icon: Phone,
      label: t("pages.contact.phone"),
      href: `tel:${contact.phone}`,
      text: contact.phone,
    })
  }
  if (contact?.address) {
    list.push({
      key: "address",
      icon: MapPin,
      label: t("pages.contact.address"),
      text: contact.address,
    })
  }
  return list
})

// A link of a network that is not in the list has no icon and no name, so it does not show.
const socialLinks = computed(() =>
  (data.value?.social_links ?? []).flatMap((link, index) => {
    const network = socialNetwork(link.network)
    return network ? [{ key: `${index}-${link.url}`, url: link.url, network }] : []
  })
)

// A getter, so the head changes with the locale.
usePageSeo(() => ({ title: t("pages.contact.title"), description: t("pages.contact.intro") }))
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
          v-if="row.href"
          :href="row.href"
          class="inline-flex min-h-11 items-center text-body break-all underline underline-offset-4 hover:text-muted-foreground"
          :target="row.key === 'whatsapp' ? '_blank' : undefined"
          :rel="row.key === 'whatsapp' ? 'noopener noreferrer' : undefined"
          >{{ row.text }}</a
        >
        <!-- The owner types the address on more than one line. The line breaks stay. -->
        <span v-else class="text-body break-words whitespace-pre-line">{{ row.text }}</span>
      </li>
    </ul>
    <section
      v-if="socialLinks.length"
      :class="rows.length ? 'mt-12' : 'mt-16'"
      aria-labelledby="contact-social-links-title"
      data-testid="contact-social-links"
    >
      <h2 id="contact-social-links-title" class="text-h3">
        {{ t("pages.contact.socialLinks") }}
      </h2>
      <ul class="mt-4 flex flex-col">
        <li v-for="link in socialLinks" :key="link.key">
          <a
            :href="link.url"
            target="_blank"
            rel="noopener noreferrer"
            class="inline-flex min-h-11 items-center gap-4 text-body underline underline-offset-4 hover:text-muted-foreground"
          >
            <SocialIcon :network="link.network.id" class="size-5 shrink-0" />
            {{ link.network.name }}
          </a>
        </li>
      </ul>
    </section>
    <Alert v-if="!rows.length && !socialLinks.length" class="mt-16">
      <AlertDescription>{{ t("pages.contact.unavailable") }}</AlertDescription>
    </Alert>
  </article>
</template>
