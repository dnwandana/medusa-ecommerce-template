<script setup lang="ts">
import { createReusableTemplate } from "@vueuse/core"
import { whatsappHref } from "~/utils/orderNotices"
import { socialNetwork } from "~/utils/socialNetworks"

const { t } = useI18n()
const { brand } = useAppConfig()
// The request does not block the render. With no home category, the Shop column shows only
// "All products".
const { categories } = useHomeCategories()
const { settings, ensureSettings } = useStorefront()

// The server render does not wait for the settings. The first client render then has the same
// footer as the server HTML, and the Contact column shows when the request is done.
onMounted(() => {
  void ensureSettings()
})

const year = new Date().getFullYear()

type FooterColumn = { id: string; title: string; links: { to: string; label: string }[] }

// The grid and the accordion both render this list, so the two views cannot differ.
const columns = computed<FooterColumn[]>(() => [
  {
    id: "shop",
    title: t("footer.shop"),
    links: [
      ...categories.value.map((category) => ({
        to: `/categories/${category.handle}`,
        label: category.name,
      })),
      { to: "/products", label: t("nav.allProducts") },
    ],
  },
  {
    id: "help",
    title: t("footer.help"),
    links: [
      { to: "/delivery", label: t("footer.delivery") },
      { to: "/returns", label: t("footer.returns") },
      { to: "/contact", label: t("footer.contact") },
      { to: "/account/orders", label: t("footer.track") },
    ],
  },
  {
    id: "about",
    title: t("footer.aboutTitle"),
    links: [{ to: "/about", label: t("footer.story") }],
  },
])

type ContactRow = { key: string; href: string; text: string; external: boolean }

// The order is WhatsApp, email, then phone. The address shows only on the contact page.
const contactRows = computed<ContactRow[]>(() => {
  const contact = settings.value.contact
  const rows: ContactRow[] = []
  const whatsapp = whatsappHref(contact.whatsapp)
  if (whatsapp && contact.whatsapp) {
    rows.push({
      key: "whatsapp",
      href: whatsapp,
      text: t("footer.whatsapp", { number: contact.whatsapp }),
      external: true,
    })
  }
  if (contact.email) {
    rows.push({
      key: "email",
      href: `mailto:${contact.email}`,
      text: contact.email,
      external: false,
    })
  }
  if (contact.phone) {
    rows.push({ key: "phone", href: `tel:${contact.phone}`, text: contact.phone, external: false })
  }
  return rows
})

// A link of a network that is not in the list has no icon and no name, so it does not show.
const socialLinks = computed(() =>
  settings.value.contact.social_links.flatMap((link, index) => {
    const network = socialNetwork(link.network)
    return network ? [{ key: `${index}-${link.url}`, url: link.url, network }] : []
  })
)

const showContact = computed(() => contactRows.value.length > 0 || socialLinks.value.length > 0)

const accordionItems = computed(() => [
  ...columns.value.map(({ id, title }) => ({ id, title })),
  ...(showContact.value ? [{ id: "contact", title: t("footer.contactTitle") }] : []),
])

// The grid and the accordion show the same contact content.
const [DefineContact, ContactContent] = createReusableTemplate()

// Each link is a 44 px target, so the rows need no extra gap.
const LINK_CLASS =
  "flex min-h-11 items-center text-body-sm text-foreground outline-none hover:text-muted-foreground focus-visible:shadow-[var(--focus-ring)]"
const ICON_LINK_CLASS =
  "inline-flex size-11 items-center justify-center text-foreground outline-none hover:text-muted-foreground focus-visible:shadow-[var(--focus-ring)]"
const SMALL_LINK_CLASS =
  "inline-flex min-h-11 items-center text-caption text-muted-foreground outline-none hover:text-foreground focus-visible:shadow-[var(--focus-ring)]"
</script>

<template>
  <footer class="bg-secondary text-foreground">
    <div
      class="mx-auto flex max-w-[1440px] flex-col gap-12 px-4 pt-16 pb-8 md:gap-20 md:px-12 md:pt-24 md:pb-10"
    >
      <DefineContact>
        <div class="flex flex-col">
          <!-- A long email has no break point, so break-all keeps it inside the column. -->
          <a
            v-for="row in contactRows"
            :key="row.key"
            :href="row.href"
            :class="[LINK_CLASS, 'break-all']"
            :target="row.external ? '_blank' : undefined"
            :rel="row.external ? 'noopener noreferrer' : undefined"
            >{{ row.text }}</a
          >
          <!-- The negative margin aligns the first icon with the text above it. -->
          <ul
            v-if="socialLinks.length"
            :aria-label="t('footer.socialLinks')"
            class="-ml-3 flex flex-wrap"
          >
            <li v-for="link in socialLinks" :key="link.key">
              <a
                :href="link.url"
                target="_blank"
                rel="noopener noreferrer"
                :aria-label="link.network.name"
                :class="ICON_LINK_CLASS"
              >
                <SocialIcon :network="link.network.id" class="size-5" />
              </a>
            </li>
          </ul>
        </div>
      </DefineContact>

      <div
        data-slot="footer-columns"
        :class="[
          'hidden md:grid md:gap-x-12',
          showContact
            ? 'md:grid-cols-[repeat(4,minmax(0,240px))]'
            : 'md:grid-cols-[repeat(3,minmax(0,240px))]',
        ]"
      >
        <nav
          v-for="column in columns"
          :key="column.id"
          :aria-labelledby="`footer-${column.id}`"
          class="flex flex-col"
        >
          <h2 :id="`footer-${column.id}`" class="mb-2 text-eyebrow">{{ column.title }}</h2>
          <NuxtLinkLocale
            v-for="link in column.links"
            :key="link.to"
            :to="link.to"
            :class="LINK_CLASS"
          >
            {{ link.label }}
          </NuxtLinkLocale>
        </nav>
        <div v-if="showContact" data-slot="footer-contact" class="flex flex-col">
          <h2 class="mb-2 text-eyebrow">{{ t("footer.contactTitle") }}</h2>
          <ContactContent />
        </div>
      </div>

      <!-- The phone view starts with all items closed, so the footer stays short. -->
      <HairlineAccordion :items="accordionItems" :heading-level="2" class="md:hidden">
        <template v-for="column in columns" :key="column.id" #[column.id]>
          <nav :aria-label="column.title" class="flex flex-col">
            <NuxtLinkLocale
              v-for="link in column.links"
              :key="link.to"
              :to="link.to"
              :class="LINK_CLASS"
            >
              {{ link.label }}
            </NuxtLinkLocale>
          </nav>
        </template>
        <template v-if="showContact" #contact>
          <ContactContent />
        </template>
      </HairlineAccordion>

      <div
        data-slot="footer-bottom"
        class="flex flex-wrap items-center justify-between gap-x-8 gap-y-4 border-t border-border pt-6"
      >
        <AppWordmark size="footer" />
        <div class="flex flex-wrap items-center gap-x-6 gap-y-2">
          <span class="text-caption text-muted-foreground">
            {{ t("footer.copyright", { year, brand: brand.name }) }}
          </span>
          <NuxtLinkLocale to="/privacy" :class="SMALL_LINK_CLASS">
            {{ t("footer.privacy") }}
          </NuxtLinkLocale>
          <NuxtLinkLocale to="/terms" :class="SMALL_LINK_CLASS">
            {{ t("footer.terms") }}
          </NuxtLinkLocale>
          <span class="text-caption text-muted-foreground">{{ t("footer.payment") }}</span>
          <LanguageSwitcher variant="footer" />
        </div>
      </div>
    </div>
  </footer>
</template>
