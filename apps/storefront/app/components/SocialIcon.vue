<script setup lang="ts">
import { socialNetwork } from "~/utils/socialNetworks"

const props = defineProps<{ network: string }>()

// A saved link can name a network that a later change removed. Such a link gets no icon.
const icon = computed(() => socialNetwork(props.network))
</script>

<template>
  <!-- The caller sets the size with a class. The fill follows the text colour of the parent. -->
  <!-- The parent link carries the accessible name, so the icon stays hidden from screen readers. -->
  <svg
    v-if="icon"
    viewBox="0 0 24 24"
    fill="currentColor"
    aria-hidden="true"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path :d="icon.path" />
  </svg>
</template>
