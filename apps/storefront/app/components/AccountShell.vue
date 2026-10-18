<script setup lang="ts">
const { customer } = useCustomer()

// A first name with only spaces counts as no name, so the heading never shows an empty name.
const firstName = computed(() => customer.value?.first_name?.trim() ?? "")
</script>

<template>
  <div class="flex flex-col gap-3">
    <p class="hidden text-eyebrow text-muted-foreground md:block">{{ $t("account.title") }}</p>
    <h1 class="text-h1">
      {{ firstName ? $t("account.greeting", { name: firstName }) : $t("account.greetingNoName") }}
    </h1>
  </div>
</template>
