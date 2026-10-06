<script setup lang="ts">
import { ShieldCheck, Truck } from "@lucide/vue"
</script>

<template>
  <ul class="flex flex-col gap-2">
    <li class="flex items-center gap-2 text-body-sm">
      <Truck aria-hidden="true" class="size-[18px]" />
      {{ $t("common.shipsIndonesia") }}
    </li>
    <li class="flex items-center gap-2 text-body-sm">
      <ShieldCheck aria-hidden="true" class="size-[18px]" />
      {{ $t("common.securePayment") }}
    </li>
  </ul>
</template>
