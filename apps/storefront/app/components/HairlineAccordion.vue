<script setup lang="ts">
import { Minus, Plus } from "@lucide/vue"

const props = defineProps<{
  items: { id: string; title: string }[]
  defaultOpen?: string[]
  headingLevel?: 2 | 3 | 4
}>()

// Each item opens on its own, so more than one item can be open.
const openIds = ref<string[]>([...(props.defaultOpen ?? [])])

const heading = computed(() => `h${props.headingLevel ?? 3}`)

// reka-ui sets the content id after the trigger renders, so the trigger gets an empty
// aria-controls. Thus the button points to a wrapper with an id from this component.
const baseId = useId()
const contentId = (id: string): string => `${baseId}-${id}`

function setOpen(id: string, open: boolean): void {
  openIds.value = open
    ? [...openIds.value.filter((openId) => openId !== id), id]
    : openIds.value.filter((openId) => openId !== id)
}
</script>

<template>
  <div class="border-b border-border">
    <!-- unmount-on-hide is false, so a closed item keeps its content, for example a typed review. -->
    <Collapsible
      v-for="item in items"
      :key="item.id"
      :open="openIds.includes(item.id)"
      :unmount-on-hide="false"
      class="border-t border-border"
      @update:open="(open: boolean) => setOpen(item.id, open)"
    >
      <component :is="heading" class="m-0">
        <CollapsibleTrigger as-child>
          <button
            type="button"
            :aria-controls="contentId(item.id)"
            class="flex min-h-14 w-full items-center justify-between gap-4 text-left text-nav text-foreground focus-visible:shadow-[var(--focus-ring)] focus-visible:outline-none"
          >
            {{ item.title }}
            <Minus v-if="openIds.includes(item.id)" class="size-4 shrink-0" aria-hidden="true" />
            <Plus v-else class="size-4 shrink-0" aria-hidden="true" />
          </button>
        </CollapsibleTrigger>
      </component>
      <div :id="contentId(item.id)">
        <CollapsibleContent class="pb-6 text-body-sm">
          <slot :name="item.id" />
        </CollapsibleContent>
      </div>
    </Collapsible>
  </div>
</template>
