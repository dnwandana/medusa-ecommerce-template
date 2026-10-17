<script setup lang="ts">
import type { HttpTypes } from "@medusajs/types"
import { Info } from "@lucide/vue"

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
    <!-- Below md the dialog is a bottom sheet: fixed to the bottom, full width, top corners rounded. -->
    <AlertDialogContent
      class="top-auto bottom-0 left-0 translate-x-0 translate-y-0 rounded-b-none data-[size=default]:max-w-none data-[size=default]:sm:max-w-none md:top-1/2 md:bottom-auto md:left-1/2 md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-b-xl data-[size=default]:md:max-w-md"
      data-testid="delete-dialog"
      @escape-key-down="blockCloseDuringDelete"
    >
      <AlertDialogHeader>
        <AlertDialogTitle>{{ $t("account.addresses.deleteTitle") }}</AlertDialogTitle>
        <AlertDialogDescription>{{ $t("account.addresses.deleteBody") }}</AlertDialogDescription>
      </AlertDialogHeader>

      <div
        v-if="address"
        class="flex flex-col gap-1 rounded-lg border p-3"
        data-testid="delete-summary"
      >
        <p class="flex flex-wrap items-center gap-2 font-medium">
          {{ titleOf(address) }}
          <Badge v-if="address.is_default_shipping">{{ $t("account.addresses.default") }}</Badge>
        </p>
        <p class="text-body-sm text-muted-foreground">
          <template v-if="fullName">{{ fullName }} · </template>{{ line }}
        </p>
      </div>

      <Alert v-if="nextDefault" variant="info" data-testid="delete-new-default">
        <Info aria-hidden="true" />
        <AlertDescription>
          {{ $t("account.addresses.newDefault", { label: titleOf(nextDefault) }) }}
        </AlertDescription>
      </Alert>
      <Alert v-else-if="isOnly" variant="info" data-testid="delete-only">
        <Info aria-hidden="true" />
        <AlertDescription>{{ $t("account.addresses.onlyAddress") }}</AlertDescription>
      </Alert>

      <Alert v-if="error" variant="destructive">
        <AlertDescription>{{ $t("account.addresses.deleteError") }}</AlertDescription>
      </Alert>

      <AlertDialogFooter
        class="rounded-b-none pb-[calc(1rem+env(safe-area-inset-bottom))] md:rounded-b-xl md:pb-4"
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
