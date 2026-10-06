<script setup lang="ts">
import { NuxtLinkLocale } from "#components"

const props = defineProps<{
  // The current page, 1 or more.
  page: number
  // The total number of products.
  count: number
  // "/products" or "/categories/<handle>", with no locale prefix. NuxtLinkLocale adds the prefix.
  path: string
}>()

const pages = computed(() => Math.ceil(props.count / PAGE_SIZE))

// Page 1 has no query, so each page has one URL.
const to = (n: number) => ({ path: props.path, query: n > 1 ? { page: n } : {} })
</script>

<template>
  <!--
    Each control renders as a real link with ?page=N, so the server renders each page and a search engine can follow the links.
    The "as" prop and not "as-child" makes the link, because the first child of Previous and Next is the chevron icon.
  -->
  <Pagination
    v-if="pages > 1"
    :total="count"
    :items-per-page="PAGE_SIZE"
    :page="page"
    :sibling-count="1"
    show-edges
    :aria-label="$t('nav.pagination')"
  >
    <PaginationContent v-slot="{ items }">
      <PaginationPrevious
        v-if="page > 1"
        :as="NuxtLinkLocale"
        :to="to(page - 1)"
        :aria-label="$t('common.previous')"
      >
        <span class="hidden sm:block">{{ $t("common.previous") }}</span>
      </PaginationPrevious>
      <template v-for="(item, index) in items" :key="index">
        <PaginationItem
          v-if="item.type === 'page'"
          :as="NuxtLinkLocale"
          :to="to(item.value)"
          :value="item.value"
          :is-active="item.value === page"
          :aria-current="item.value === page ? 'page' : undefined"
        >
          {{ item.value }}
        </PaginationItem>
        <PaginationEllipsis v-else :index="index" :label="$t('common.morePages')" />
      </template>
      <PaginationNext
        v-if="page < pages"
        :as="NuxtLinkLocale"
        :to="to(page + 1)"
        :aria-label="$t('common.next')"
      >
        <span class="hidden sm:block">{{ $t("common.next") }}</span>
      </PaginationNext>
    </PaginationContent>
  </Pagination>
</template>
