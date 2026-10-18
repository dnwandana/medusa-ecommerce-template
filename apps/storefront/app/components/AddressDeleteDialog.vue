<script setup lang="ts">
import type { HttpTypes } from "@medusajs/types"
import { CircleAlert, Info } from "@lucide/vue"

const props = defineProps<{
  address: HttpTypes.StoreCustomerAddress | null
  // The current list in the list order. It gives the next default address.
  addresses: HttpTypes.StoreCustomerAddress[]
}>()

const open = defineModel<boolean>("open", { required: true })

const emit = defineEmits<{ deleted: [] }>()

const { t } = useI18n()
const { remove } = useAddresses()

const deleting = ref(false)
const error = ref(false)

// An error from an earlier try must not show when the customer opens the dialog again.
watch(open, (value) => {
  if (value) {
    error.value = false
  }
})

const titleOf = (address: HttpTypes.StoreCustomerAddress) =>
  address.address_name || t("account.addresses.untitled")

// The Medusa admin can save null values. A filter on the parts keeps the text "null" out.
const fullName = computed(() =>
  [props.address?.first_name, props.address?.last_name].filter(Boolean).join(" ")
)
const line = computed(() => (props.address ? addressLine(fromCustomerAddress(props.address)) : ""))

const others = computed(() => props.addresses.filter((address) => address.id !== props.address?.id))
// remove of useAddresses makes the first other address in the list order the new default.
const nextDefault = computed(() =>
  props.address?.is_default_shipping ? (others.value[0] ?? null) : null
)
const isOnly = computed(() => others.value.length === 0)

async function confirmDelete(): Promise<void> {
  if (!props.address || deleting.value) {
    return
  }
  deleting.value = true
  error.value = false
  try {
    await remove(props.address.id)
  } catch {
    error.value = true
    return
  } finally {
    deleting.value = false
  }
  emit("deleted")
  open.value = false
}

// The customer must not close the dialog during the request, because the result has no place
// to show.
function blockCloseDuringDelete(event: Event): void {
  if (deleting.value) {
    event.preventDefault()
  }
}
</script>

<template>
  <AlertDialog v-model:open="open">
    <!-- Below md the dialog is a bottom sheet: fixed to the bottom and full width. -->
    <AlertDialogContent
      class="top-auto bottom-0 left-0 max-w-none translate-x-0 translate-y-0 gap-0 p-0 sm:max-w-none md:top-1/2 md:bottom-auto md:left-1/2 md:max-w-[440px] md:-translate-x-1/2 md:-translate-y-1/2"
      data-testid="delete-dialog"
      @escape-key-down="blockCloseDuringDelete"
    >
      <AlertDialogHeader class="place-items-start gap-2 px-4 pt-5 text-left md:px-8 md:pt-8">
        <AlertDialogTitle class="text-h3 font-normal">
          {{ $t("account.addresses.deleteTitle") }}
        </AlertDialogTitle>
        <AlertDialogDescription class="text-body-sm text-muted-foreground">
          {{ $t("account.addresses.deleteBody") }}
        </AlertDialogDescription>
      </AlertDialogHeader>

      <div class="flex flex-col gap-4 px-4 py-6 md:px-8">
        <div
          v-if="address"
          class="flex flex-col gap-1 bg-secondary px-5 py-4"
          data-testid="delete-summary"
        >
          <p class="flex flex-wrap items-center gap-2 text-body font-medium">
            {{ titleOf(address) }}
            <Badge v-if="address.is_default_shipping">{{ $t("account.addresses.default") }}</Badge>
          </p>
          <p class="text-body-sm text-muted-foreground">
            <template v-if="fullName">{{ fullName }} · </template>{{ line }}
          </p>
        </div>

        <Alert v-if="nextDefault" data-testid="delete-new-default">
          <Info :stroke-width="1.5" aria-hidden="true" />
          <AlertDescription>
            {{ $t("account.addresses.newDefault", { label: titleOf(nextDefault) }) }}
          </AlertDescription>
        </Alert>
        <Alert v-else-if="isOnly" data-testid="delete-only">
          <Info :stroke-width="1.5" aria-hidden="true" />
          <AlertDescription>{{ $t("account.addresses.onlyAddress") }}</AlertDescription>
        </Alert>

        <Alert v-if="error" variant="destructive">
          <CircleAlert :stroke-width="1.5" aria-hidden="true" />
          <AlertDescription>{{ $t("account.addresses.deleteError") }}</AlertDescription>
        </Alert>
      </div>

      <!-- The content has no padding, so the footer needs no negative margins. The bottom padding
           keeps the buttons above the home bar of a phone. -->
      <AlertDialogFooter
        class="mx-0 mb-0 pb-[calc(1rem+env(safe-area-inset-bottom,0px))] md:px-8 md:pb-8"
      >
        <AlertDialogCancel data-testid="delete-cancel" :disabled="deleting">
          {{ $t("common.cancel") }}
        </AlertDialogCancel>
        <!-- A plain Button, because AlertDialogAction closes the dialog before the request ends. -->
        <Button
          type="button"
          variant="destructive"
          data-testid="delete-confirm"
          :disabled="deleting"
          @click="confirmDelete"
        >
          <template v-if="deleting">
            <Spinner />
            {{ $t("account.addresses.deleting") }}
          </template>
          <template v-else>{{ $t("account.addresses.confirmDelete") }}</template>
        </Button>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>
</template>
