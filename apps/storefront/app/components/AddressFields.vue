<script setup lang="ts">
import type { AddressErrors, AddressFormValues } from "~/utils/addressForm"
import { PROVINCES } from "~/utils/provinces"

type AddressFieldName = Exclude<keyof AddressFormValues, "address_name">

type AddressField = {
  name: AddressFieldName
  label: string
  autocomplete: string
  control: "input" | "textarea" | "select"
  type?: string
  inputmode?: "tel" | "numeric"
  maxlength?: number
  placeholder?: string
  hint?: string
}

const props = defineProps<{
  idPrefix: string
  errors: AddressErrors
  disabled?: boolean
}>()
const values = defineModel<AddressFormValues>({ required: true })

// The order is the order of the spec. A guest and a customer both give the phone of the
// recipient here, because the courier calls the recipient.
const FIELDS: AddressField[] = [
  { name: "full_name", label: "checkout.fullName", autocomplete: "name", control: "input" },
  {
    name: "phone",
    label: "checkout.phone",
    autocomplete: "tel",
    control: "input",
    type: "tel",
    inputmode: "tel",
    hint: "checkout.phoneHint",
  },
  {
    name: "address_1",
    label: "checkout.address1",
    autocomplete: "street-address",
    control: "textarea",
    placeholder: "checkout.addressPlaceholder",
    hint: "checkout.addressHint",
  },
  { name: "city", label: "checkout.city", autocomplete: "address-level2", control: "input" },
  {
    name: "province",
    label: "checkout.province",
    autocomplete: "address-level1",
    control: "select",
    placeholder: "checkout.provincePlaceholder",
  },
  {
    name: "postal_code",
    label: "checkout.postalCode",
    autocomplete: "postal-code",
    control: "input",
    inputmode: "numeric",
    maxlength: 5,
  },
]

// The prefix keeps each id unique when two address forms are on one page.
function controlId(name: AddressFieldName): string {
  return `${props.idPrefix}-${name}`
}

function describedBy(field: AddressField): string | undefined {
  return field.hint ? `${controlId(field.name)}-hint` : undefined
}

// A new object tells the parent that the model changed, also when the parent watches the object.
function update(name: AddressFieldName, value: string | number | undefined): void {
  values.value = { ...values.value, [name]: String(value ?? "") }
}
</script>

<template>
  <!-- One column at all widths (spec 6.1), so the FieldGroup has no "two-col" class. -->
  <FieldGroup data-testid="address-fields">
    <Field v-for="field in FIELDS" :key="field.name">
      <FieldLabel :for="controlId(field.name)">{{ $t(field.label) }}</FieldLabel>
      <Textarea
        v-if="field.control === 'textarea'"
        :id="controlId(field.name)"
        :model-value="values[field.name]"
        :name="field.name"
        rows="3"
        class="min-h-0"
        :placeholder="field.placeholder ? $t(field.placeholder) : undefined"
        :autocomplete="field.autocomplete"
        :disabled="disabled"
        :aria-invalid="errors[field.name] ? true : undefined"
        :aria-describedby="describedBy(field)"
        @update:model-value="update(field.name, $event)"
      />
      <NativeSelect
        v-else-if="field.control === 'select'"
        :id="controlId(field.name)"
        :model-value="values[field.name]"
        :name="field.name"
        :placeholder="field.placeholder ? $t(field.placeholder) : undefined"
        :autocomplete="field.autocomplete"
        :disabled="disabled"
        :aria-invalid="errors[field.name] ? true : undefined"
        :aria-describedby="describedBy(field)"
        @update:model-value="update(field.name, $event)"
      >
        <option v-for="province in PROVINCES" :key="province" :value="province">
          {{ province }}
        </option>
      </NativeSelect>
      <Input
        v-else
        :id="controlId(field.name)"
        :model-value="values[field.name]"
        :name="field.name"
        :type="field.type ?? 'text'"
        :inputmode="field.inputmode"
        :maxlength="field.maxlength"
        :autocomplete="field.autocomplete"
        :disabled="disabled"
        :aria-invalid="errors[field.name] ? true : undefined"
        :aria-describedby="describedBy(field)"
        @update:model-value="update(field.name, $event)"
      />
      <FieldDescription v-if="field.hint" :id="describedBy(field)">
        {{ $t(field.hint) }}
      </FieldDescription>
      <FieldError v-if="errors[field.name]">{{ $t(errors[field.name]!) }}</FieldError>
    </Field>
  </FieldGroup>
</template>
