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
const fullName = computed(() =>
  [props.address.first_name, props.address.last_name].filter(Boolean).join(" ")
)
const region = computed(() =>
  [props.address.province, props.address.postal_code].filter(Boolean).join(" ")
)
</script>

<template>
  <Card
    :data-testid="`address-card-${address.id}`"
    :class="address.is_default_shipping ? 'border-primary' : undefined"
  >
    <CardHeader>
      <CardTitle>
        <h3>{{ address.address_name || $t("account.addresses.untitled") }}</h3>
      </CardTitle>
      <CardAction v-if="address.is_default_shipping">
        <Badge>
          <Check aria-hidden="true" class="size-3" />
          {{ $t("account.addresses.default") }}
        </Badge>
      </CardAction>
    </CardHeader>

    <CardContent class="flex flex-1 flex-col gap-1 pt-2 md:pt-2">
      <p v-if="fullName">{{ fullName }}</p>
      <!-- The saved address keeps the line breaks that the customer typed. -->
      <p v-if="address.address_1" class="whitespace-pre-line text-body-sm text-muted-foreground">
        {{ address.address_1 }}
      </p>
      <p v-if="address.city" class="text-body-sm text-muted-foreground">{{ address.city }}</p>
      <p v-if="region" class="text-body-sm text-muted-foreground">{{ region }}</p>
      <p v-if="address.phone" class="text-body-sm text-muted-foreground">{{ address.phone }}</p>
    </CardContent>

    <CardFooter class="flex-wrap gap-1 pt-4">
      <Button
        type="button"
        variant="ghost"
        size="sm"
        :data-testid="`edit-${address.id}`"
        :disabled="disabled"
        @click="$emit('edit')"
      >
        <Pencil aria-hidden="true" />
        {{ $t("account.addresses.edit") }}
      </Button>
      <Button
        v-if="!address.is_default_shipping"
        type="button"
        variant="ghost"
        size="sm"
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
      </Button>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        class="text-destructive"
        :data-testid="`delete-${address.id}`"
        :disabled="disabled"
        @click="$emit('remove')"
      >
        <Trash2 aria-hidden="true" />
        {{ $t("account.addresses.delete") }}
      </Button>
    </CardFooter>
  </Card>
</template>
