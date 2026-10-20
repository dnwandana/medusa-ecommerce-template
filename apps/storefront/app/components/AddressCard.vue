<script setup lang="ts">
import type { HttpTypes } from "@medusajs/types"
import { Check, Pencil, Star, Trash2 } from "@lucide/vue"

const props = defineProps<{
  address: HttpTypes.StoreCustomerAddress
  disabled: boolean
  busy: boolean
}>()

defineEmits<{ edit: []; setDefault: []; remove: [] }>()

// The Medusa admin can save null values. A filter on the parts keeps the text "null" and empty
// lines out of the card.
const fullName = computed(() => joinFullName(props.address.first_name, props.address.last_name))
const region = computed(() =>
  [props.address.province, props.address.postal_code].filter(Boolean).join(" ")
)
const titleId = computed(() => `address-card-${props.address.id}-title`)

const actionClass =
  "inline-flex min-h-11 items-center gap-2 text-field-label outline-none underline-offset-4 hover:underline focus-visible:shadow-[var(--focus-ring)] disabled:cursor-not-allowed disabled:text-disabled-foreground disabled:no-underline [&_svg]:size-4"
</script>

<template>
  <article
    :data-testid="`address-card-${address.id}`"
    :aria-labelledby="titleId"
    class="flex flex-col gap-4 pt-5"
    :class="address.is_default_shipping ? 'border-t-2 border-foreground' : 'border-t border-border'"
  >
    <div class="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
      <h3 :id="titleId" class="text-h4">
        {{ address.address_name || $t("account.addresses.untitled") }}
      </h3>
      <Badge v-if="address.is_default_shipping" class="gap-1">
        <Check aria-hidden="true" class="size-3" />
        {{ $t("account.addresses.default") }}
      </Badge>
    </div>

    <div class="flex flex-col gap-0.5">
      <p v-if="fullName" class="text-body">{{ fullName }}</p>
      <!-- The saved address keeps the line breaks that the customer typed. -->
      <p v-if="address.address_1" class="text-body-sm whitespace-pre-line text-muted-foreground">
        {{ address.address_1 }}
      </p>
      <p v-if="address.city" class="text-body-sm text-muted-foreground">{{ address.city }}</p>
      <p v-if="region" class="text-body-sm text-muted-foreground">{{ region }}</p>
      <p v-if="address.phone" class="text-body-sm text-muted-foreground">{{ address.phone }}</p>
    </div>

    <div class="mt-auto flex flex-wrap gap-x-6">
      <button
        type="button"
        :class="[actionClass, 'text-foreground']"
        :data-testid="`edit-${address.id}`"
        :disabled="disabled"
        @click="$emit('edit')"
      >
        <Pencil aria-hidden="true" />
        {{ $t("account.addresses.edit") }}
      </button>
      <button
        v-if="!address.is_default_shipping"
        type="button"
        :class="[actionClass, 'text-foreground']"
        :data-testid="`set-default-${address.id}`"
        :disabled="disabled"
        @click="$emit('setDefault')"
      >
        <template v-if="busy">
          <Spinner />
          {{ $t("account.addresses.saving") }}
        </template>
        <template v-else>
          <Star aria-hidden="true" />
          {{ $t("account.addresses.setDefault") }}
        </template>
      </button>
      <button
        type="button"
        :class="[actionClass, 'text-destructive']"
        :data-testid="`delete-${address.id}`"
        :disabled="disabled"
        @click="$emit('remove')"
      >
        <Trash2 aria-hidden="true" />
        {{ $t("account.addresses.delete") }}
      </button>
    </div>
  </article>
</template>
