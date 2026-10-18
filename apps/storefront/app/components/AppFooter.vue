<script setup lang="ts">
const { t } = useI18n()
const { brand } = useAppConfig()
// The request does not block the render. With no home category, the Shop column shows only
// "All products".
const { categories } = useHomeCategories()

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

const accordionItems = computed(() => columns.value.map(({ id, title }) => ({ id, title })))

// Each link is a 44 px target, so the rows need no extra gap.
const LINK_CLASS =
  "flex min-h-11 items-center text-body-sm text-foreground outline-none hover:text-muted-foreground focus-visible:shadow-[var(--focus-ring)]"
const SMALL_LINK_CLASS =
  "inline-flex min-h-11 items-center text-caption text-muted-foreground outline-none hover:text-foreground focus-visible:shadow-[var(--focus-ring)]"
</script>

<template>
  <footer class="bg-secondary text-foreground">
    <div
      class="mx-auto flex max-w-[1440px] flex-col gap-12 px-4 pt-16 pb-8 md:gap-20 md:px-12 md:pt-24 md:pb-10"
    >
      <div
        data-slot="footer-columns"
        class="hidden md:grid md:grid-cols-[repeat(3,minmax(0,240px))] md:gap-x-12"
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
