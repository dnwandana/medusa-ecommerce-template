<script setup lang="ts">
import type { HttpTypes } from "@medusajs/types"
import { MapPin, Plus } from "@lucide/vue"
import { toast } from "vue-sonner"

definePageMeta({ middleware: "auth" })

const { t } = useI18n()
const { addresses, load, setDefault } = useAddresses()

const ready = ref(false)
const loadFailed = ref(false)
// The id of the address that "Set as default" changes. All actions stop until the request ends.
const busyId = ref<string | null>(null)

const dialogOpen = ref(false)
const editing = ref<HttpTypes.StoreCustomerAddress | null>(null)
const deleteOpen = ref(false)
const deleting = ref<HttpTypes.StoreCustomerAddress | null>(null)

const list = computed(() => addresses.value ?? [])

const titleOf = (address: HttpTypes.StoreCustomerAddress) =>
  address.address_name || t("account.addresses.untitled")

async function loadList(): Promise<void> {
  ready.value = false
  loadFailed.value = false
  try {
    await load()
  } catch {
    // load of useAddresses throws for each error. The alert lets the customer try again.
    loadFailed.value = true
  }
  ready.value = true
}

// The dialog resets its form when it opens. Set the address first, so the form gets its values.
function openDialog(address: HttpTypes.StoreCustomerAddress | null): void {
  editing.value = address
  dialogOpen.value = true
}

function openDelete(address: HttpTypes.StoreCustomerAddress): void {
  deleting.value = address
  deleteOpen.value = true
}

function onSaved(kind: "added" | "updated"): void {
  toast.success(t(kind === "added" ? "account.addresses.added" : "account.addresses.updated"))
}

function onDeleted(): void {
  toast.success(t("account.addresses.deleted"))
}

async function makeDefault(address: HttpTypes.StoreCustomerAddress): Promise<void> {
  if (busyId.value) {
    return
  }
  busyId.value = address.id
  try {
    await setDefault(address.id)
    toast.success(t("account.addresses.defaultDone", { label: titleOf(address) }))
  } catch {
    // setDefault of useAddresses changes the state only after a success. The list stays the same.
    toast.error(t("account.addresses.defaultError"))
  } finally {
    busyId.value = null
  }
}

// The session cookie is in the browser. Load the list after the mount.
onMounted(loadList)

useHead({ title: () => t("account.addresses.title") })
</script>

<template>
  <AccountNav>
    <section class="flex flex-col gap-6">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div class="flex flex-col gap-1">
          <h2 class="text-h2">{{ $t("account.addresses.title") }}</h2>
          <p class="text-body-sm text-muted-foreground">{{ $t("account.addresses.intro") }}</p>
        </div>
        <!-- The empty block has its own button. The loading state and the error have none. -->
        <Button
          v-if="ready && !loadFailed && list.length > 0"
          type="button"
          data-testid="add-address"
          :disabled="!!busyId"
          @click="openDialog(null)"
        >
          <Plus aria-hidden="true" />
          {{ $t("account.addresses.add") }}
        </Button>
      </div>

      <div v-if="!ready" role="status" class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <span class="sr-only">{{ $t("common.loading") }}</span>
        <Card v-for="index in 3" :key="index" data-testid="address-skeleton">
          <CardContent class="flex flex-col gap-3">
            <Skeleton class="h-5 w-2/5" />
            <Skeleton class="h-4 w-3/5" />
            <Skeleton class="h-4 w-11/12" />
            <Skeleton class="h-4 w-3/4" />
            <Skeleton class="mt-4 h-8 w-2/5" />
          </CardContent>
        </Card>
      </div>

      <Alert v-else-if="loadFailed" variant="destructive">
        <AlertDescription>{{ $t("account.addresses.loadError") }}</AlertDescription>
        <AlertAction>
          <Button
            type="button"
            variant="outline"
            size="sm"
            data-testid="addresses-retry"
            @click="loadList"
          >
            {{ $t("common.retry") }}
          </Button>
        </AlertAction>
      </Alert>

      <Empty v-else-if="list.length === 0" variant="outline">
        <EmptyHeader>
          <EmptyMedia>
            <MapPin class="size-6" aria-hidden="true" />
          </EmptyMedia>
          <EmptyTitle>{{ $t("account.addresses.emptyTitle") }}</EmptyTitle>
          <EmptyDescription>{{ $t("account.addresses.emptyBody") }}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent>
          <Button type="button" data-testid="empty-add-address" @click="openDialog(null)">
            <Plus aria-hidden="true" />
            {{ $t("account.addresses.add") }}
          </Button>
        </EmptyContent>
      </Empty>

      <!-- useAddresses sorts the list: the default address first, then the order of creation. -->
      <div v-else class="grid grid-cols-1 gap-4 md:grid-cols-2">
        <AddressCard
          v-for="address in list"
          :key="address.id"
          :address="address"
          :disabled="!!busyId"
          :busy="busyId === address.id"
          @edit="openDialog(address)"
          @set-default="makeDefault(address)"
          @remove="openDelete(address)"
        />
      </div>
    </section>

    <AddressDialog
      v-model:open="dialogOpen"
      :address="editing"
      :first="list.length === 0"
      @saved="onSaved"
    />
    <AddressDeleteDialog
      v-model:open="deleteOpen"
      :address="deleting"
      :addresses="list"
      @deleted="onDeleted"
    />
  </AccountNav>
</template>
