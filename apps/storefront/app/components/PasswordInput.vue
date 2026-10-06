<script setup lang="ts">
import { Eye, EyeOff, Lock } from "@lucide/vue"

withDefaults(
  defineProps<{
    id: string
    modelValue: string
    autocomplete: "current-password" | "new-password"
    name?: string
    describedby?: string
    invalid?: boolean
  }>(),
  { name: "password", describedby: undefined, invalid: false }
)
const emit = defineEmits<{ "update:modelValue": [value: string] }>()
const visible = ref(false)
</script>

<template>
  <InputGroup>
    <InputGroupAddon>
      <Lock aria-hidden="true" />
    </InputGroupAddon>
    <InputGroupInput
      :id="id"
      :name="name"
      :autocomplete="autocomplete"
      :type="visible ? 'text' : 'password'"
      :aria-describedby="describedby"
      :aria-invalid="invalid || undefined"
      :model-value="modelValue"
      @update:model-value="emit('update:modelValue', String($event))"
    />
    <!-- The toggle is in a form. The type "button" stops a click from submitting the form. -->
    <InputGroupButton
      type="button"
      :aria-label="$t(visible ? 'auth.hidePassword' : 'auth.showPassword')"
      :aria-pressed="visible ? 'true' : 'false'"
      @click="visible = !visible"
    >
      <EyeOff v-if="visible" aria-hidden="true" />
      <Eye v-else aria-hidden="true" />
    </InputGroupButton>
  </InputGroup>
</template>
