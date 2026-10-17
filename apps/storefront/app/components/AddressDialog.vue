<script setup lang="ts">
import { XIcon } from "@lucide/vue"
import type { HttpTypes } from "@medusajs/types"
import {
  type AddressErrors,
  type AddressFormValues,
  emptyAddressForm,
  fromCustomerAddress,
  validateAddressForm,
} from "~/utils/addressForm"

const props = defineProps<{
  address: HttpTypes.StoreCustomerAddress | null
  first: boolean
}>()
const open = defineModel<boolean>("open", { required: true })
const emit = defineEmits<{ saved: [kind: "added" | "updated"] }>()

// Only one address dialog is on a page, so a fixed prefix gives unique ids.
const ID_PREFIX = "address-dialog"

const { create, update } = useAddresses()

const form = ref<AddressFormValues>(emptyAddressForm())
const errors = ref<AddressErrors>({})
const serverError = ref(false)
const makeDefault = ref(false)
const busy = ref(false)

const isEdit = computed(() => props.address !== null)

// The first address must be the default. The default address stays the default until the
// customer selects "Set as default" on a different address.
const locked = computed(() =>
  props.address ? props.address.is_default_shipping === true : props.first
)
const hint = computed(() => {
  if (!locked.value) {
    return null
  }
  return props.address ? "account.addresses.defaultHint" : "account.addresses.firstHint"
})

// "Add address" has no subtitle. reka-ui wants an explicit undefined then, so that the dialog
// does not point to a description that does not exist.
const describedBy = computed(() => (isEdit.value ? {} : { "aria-describedby": undefined }))

// Each open starts from the current address, so the values of a cancelled edit do not stay.
watch(
  open,
  (value) => {
    if (!value) {
      return
    }
    form.value = props.address ? fromCustomerAddress(props.address) : emptyAddressForm()
    errors.value = {}
    serverError.value = false
    makeDefault.value = props.address?.is_default_shipping ?? false
  },
  { immediate: true }
)

// The dialog stays open during the save, because the result shows in the dialog.
function onOpenChange(value: boolean): void {
  if (!value && busy.value) {
    return
  }
  open.value = value
}

function blockDuringSave(event: Event): void {
  if (busy.value) {
    event.preventDefault()
  }
}

async function submit(): Promise<void> {
  // A second click during the save must not create a second address.
  if (busy.value) {
    return
  }
  errors.value = validateAddressForm(form.value, { phone: true })
  if (Object.keys(errors.value).length > 0) {
    return
  }

  busy.value = true
  serverError.value = false
  const isDefault = locked.value || makeDefault.value
  try {
    if (props.address) {
      await update(props.address.id, form.value, isDefault)
    } else {
      await create(form.value, isDefault)
    }
  } catch {
    // The values stay in the form, so the customer can try again.
    serverError.value = true
    return
  } finally {
    busy.value = false
  }

  emit("saved", props.address ? "updated" : "added")
  open.value = false
}
</script>

<template>
  <Dialog :open="open" @update:open="onOpenChange">
    <!-- Below md the dialog fills the screen and the footer stays at the bottom. -->
    <DialogContent
      :show-close-button="false"
      v-bind="describedBy"
      class="top-0 left-0 flex h-dvh max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none p-0 sm:max-w-none md:top-1/2 md:left-1/2 md:h-auto md:max-h-[calc(100dvh-4rem)] md:max-w-[520px] md:-translate-x-1/2 md:-translate-y-1/2 md:rounded-xl"
      @escape-key-down="blockDuringSave"
      @interact-outside="blockDuringSave"
    >
      <form novalidate class="flex min-h-0 flex-1 flex-col" @submit.prevent="submit">
        <DialogHeader class="flex-row items-start justify-between gap-3 px-4 pt-5 md:px-6">
          <div class="flex flex-col gap-1">
            <DialogTitle>
              {{ $t(isEdit ? "account.addresses.editTitle" : "account.addresses.addTitle") }}
            </DialogTitle>
            <DialogDescription v-if="isEdit">
              {{ $t("account.addresses.editSubtitle") }}
            </DialogDescription>
          </div>
          <DialogClose as-child>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              :disabled="busy"
              :aria-label="$t('common.close')"
            >
              <XIcon />
            </Button>
          </DialogClose>
        </DialogHeader>

        <div class="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 py-5 md:px-6">
          <Field>
            <FieldLabel :for="`${ID_PREFIX}-address_name`">{{ $t("checkout.label") }}</FieldLabel>
            <Input
              :id="`${ID_PREFIX}-address_name`"
              v-model="form.address_name"
              name="address_name"
              autocomplete="off"
              :placeholder="$t('checkout.labelPlaceholder')"
              :disabled="busy"
            />
          </Field>

          <AddressFields
            v-model="form"
            :id-prefix="ID_PREFIX"
            :errors="errors"
            :phone="true"
            :disabled="busy"
          />

          <Field orientation="horizontal" data-testid="address-default">
            <Checkbox
              :id="`${ID_PREFIX}-default`"
              :model-value="locked || makeDefault"
              :disabled="locked || busy"
              :aria-describedby="hint ? `${ID_PREFIX}-default-hint` : undefined"
              @update:model-value="makeDefault = $event === true"
            />
            <FieldContent>
              <FieldLabel :for="`${ID_PREFIX}-default`">
                {{ $t("account.addresses.useAsDefault") }}
              </FieldLabel>
              <FieldDescription v-if="hint" :id="`${ID_PREFIX}-default-hint`">
                {{ $t(hint) }}
              </FieldDescription>
            </FieldContent>
          </Field>

          <Alert v-if="serverError" variant="destructive">
            <AlertDescription>{{ $t("account.addresses.saveError") }}</AlertDescription>
          </Alert>
        </div>

        <DialogFooter class="mx-0 mb-0 flex-row rounded-none md:rounded-b-xl">
          <DialogClose as-child>
            <Button type="button" variant="outline" class="flex-1 md:flex-none" :disabled="busy">
              {{ $t("common.cancel") }}
            </Button>
          </DialogClose>
          <Button
            type="submit"
            class="flex-1 md:flex-none"
            :disabled="busy"
            data-testid="address-save"
          >
            <template v-if="busy">
              <Spinner />
              {{ $t("account.addresses.saving") }}
            </template>
            <template v-else>
              {{ $t(isEdit ? "account.addresses.saveChanges" : "account.addresses.save") }}
            </template>
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  </Dialog>
</template>
