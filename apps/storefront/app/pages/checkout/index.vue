<script setup lang="ts">
import { Check, ShoppingBag, TriangleAlert } from "@lucide/vue"
import type { HttpTypes } from "@medusajs/types"
import type { AddressListState } from "~/components/CheckoutAddressPicker.vue"
import type { ShippingChoice } from "~/composables/useCheckout"
import type { AddressErrors, AddressFormValues, CartAddress } from "~/utils/addressForm"
import { NEW_ADDRESS } from "~/utils/addressForm"
import type { ContactValues } from "~/utils/checkoutForm"

definePageMeta({ layout: "checkout" })

const { t } = useI18n()
const localePath = useLocalePath()
const { cart, load } = useCart()
const { customer } = useCustomer()
const checkout = useCheckout()
const bankTransfer = useBankTransfer()
const { addresses, load: loadSavedAddresses, create: createAddress } = useAddresses()

const contact = reactive<ContactValues>({ email: "" })
const form = ref<AddressFormValues>(emptyAddressForm())
const contactErrors = ref<Partial<Record<keyof ContactValues, string>>>({})
const addressErrors = ref<AddressErrors>({})
// The address that the last successful "Continue" wrote to the cart. The payment uses it.
const sentAddress = ref<CartAddress | null>(null)
const options = ref<ShippingChoice[]>([])
const selectedOptionId = ref<string | null>(null)
// A message key of the group checkout.errors, or null.
const message = ref<string | null>(null)
const ready = ref(false)
const busy = ref(false)
// True while pay() runs. Place order shows its spinner text.
const placing = ref(false)
// The step of "Continue" that runs now. The button shows its text.
const phase = ref<"saving" | "shipping" | null>(null)
// An address id, or NEW_ADDRESS.
const selected = ref<string>(NEW_ADDRESS)
const save = ref(true)
const makeDefault = ref(false)
const addressState = ref<AddressListState>("loading")
// True when "Continue" stopped at a saved address that does not pass the validation.
const invalidAddress = ref(false)
// The payment providers of the region. The page loads them when the payment step opens.
const providers = ref<{ id: string }[]>([])
const providerState = ref<"idle" | "loading" | "ready" | "failed">("idle")
// The payment deadline of a bank transfer order, from the backend. The rows show only after a
// load sets it.
const deadlineHours = ref(0)
const selectedProviderId = ref<string | null>(null)
// The title of the address that the last "Continue" saved to the account, or null.
const savedLabel = ref<string | null>(null)
// True when the last "Continue" did not save the address to the account.
const addressNotSaved = ref(false)

// True when the page shows the address form: a guest, a failed load, Case B, or NEW_ADDRESS.
const formOpen = computed(() => {
  if (!customer.value || addressState.value === "failed") {
    return true
  }
  return !addresses.value?.length || selected.value === NEW_ADDRESS
})

// The saved addresses are not known while they load. Continue must not use an old selection.
const continueBlocked = computed(() => !!customer.value && addressState.value === "loading")

// Copies the email of the logged-in customer into the contact field when the field is empty.
function fill(current: HttpTypes.StoreCustomer): void {
  if (!contact.email && current.email) {
    contact.email = current.email
  }
}

// Fills the form with the name and the phone of the profile. The other fields are empty.
function resetForm(): void {
  form.value = emptyAddressForm(customer.value)
}

// Loads the saved addresses. The list is sorted, so the first address is the default address.
async function loadAddresses(): Promise<void> {
  addressState.value = "loading"
  try {
    await loadSavedAddresses()
  } catch {
    addressState.value = "failed"
    return
  }
  selected.value = addresses.value?.[0]?.id ?? NEW_ADDRESS
  addressState.value = "ready"
}

watch(
  customer,
  (current) => {
    if (!current) {
      return
    }
    fill(current)
    resetForm()
    loadAddresses()
  },
  { immediate: true }
)

// A change after "Continue" makes the saved address old and the values not checked. Remove the
// shipping choice, so that the customer must select "Continue" again before the payment.
watch(
  [contact, form],
  () => {
    sentAddress.value = null
    options.value = []
    selectedOptionId.value = null
  },
  { deep: true }
)

// A new selection makes the address in the cart old, as a change of a field does.
watch(selected, () => {
  sentAddress.value = null
  options.value = []
  selectedOptionId.value = null
  invalidAddress.value = false
  savedLabel.value = null
  addressNotSaved.value = false
})

const PHASE_LABELS = {
  saving: "checkout.savingAddress",
  shipping: "checkout.loadingShipping",
} as const

const continueLabel = computed(() =>
  phase.value ? PHASE_LABELS[phase.value] : "checkout.continue"
)

// Returns the address for the cart, or null when a field is not valid.
function cartAddress(): CartAddress | null {
  contactErrors.value = validateContact(contact)
  addressErrors.value = {}

  if (formOpen.value) {
    addressErrors.value = validateAddressForm(form.value)
    if (Object.keys(contactErrors.value).length || Object.keys(addressErrors.value).length) {
      return null
    }
    return toCartAddress(form.value)
  }

  if (Object.keys(contactErrors.value).length) {
    return null
  }
  const saved = addresses.value?.find((address) => address.id === selected.value)
  // The Medusa admin can save an address with no phone or no postal code. The courier needs them.
  const values = saved ? fromCustomerAddress(saved) : null
  if (!values || Object.keys(validateAddressForm(values)).length) {
    invalidAddress.value = true
    return null
  }
  return toCartAddress(values)
}

// Saves the typed address to the account when the customer asks for it, and returns the address
// for the cart. A failed save must not stop the checkout (spec section 4).
async function saveToAccount(typed: CartAddress): Promise<CartAddress> {
  // After a failed load the list is not known. A save as the "first" address could then remove
  // the default flag from a real saved address.
  if (!customer.value || !formOpen.value || addressState.value !== "ready" || !save.value) {
    return typed
  }
  const isDefault = !addresses.value?.length || makeDefault.value
  phase.value = "saving"
  try {
    const created = await createAddress(form.value, isDefault)
    selected.value = created.id
    resetForm()
    save.value = true
    makeDefault.value = false
    // The watches of selected and form remove the shipping options and the status line. Let them
    // run now, so that they do not remove the result of this "Continue".
    await nextTick()
    savedLabel.value = created.address_name || t("account.addresses.untitled")
    return toCartAddress(fromCustomerAddress(created))
  } catch {
    // The form keeps the values, and the cart gets the typed address.
    addressNotSaved.value = true
    return typed
  } finally {
    phase.value = null
  }
}

// Checks the form, saves the address, and loads the shipping options.
async function submitAddress(): Promise<void> {
  // A second submit can come before the disabled button renders. It must not create a second
  // address.
  if (busy.value) {
    return
  }
  busy.value = true
  try {
    message.value = null
    invalidAddress.value = false
    savedLabel.value = null
    addressNotSaved.value = false
    sentAddress.value = null
    options.value = []
    selectedOptionId.value = null

    const typed = cartAddress()
    if (!typed) {
      return
    }
    const address = await saveToAccount(typed)

    try {
      await checkout.saveContact(contact.email, address)
    } catch {
      message.value = "checkout.errors.save"
      return
    }
    sentAddress.value = address

    phase.value = "shipping"
    try {
      options.value = await checkout.loadShippingOptions()
    } catch {
      message.value = "checkout.errors.shipping"
      return
    } finally {
      phase.value = null
    }

    const [only] = options.value
    if (options.value.length === 1 && only) {
      await chooseOption(only.id)
    }
  } finally {
    busy.value = false
  }
}

// Saves the shipping option in the cart.
async function chooseOption(optionId: string): Promise<void> {
  busy.value = true
  message.value = null
  try {
    await checkout.selectShippingOption(optionId)
    selectedOptionId.value = optionId
  } catch {
    message.value = "checkout.errors.shipping"
  } finally {
    busy.value = false
  }
}

// Loads the payment providers and selects the first one. A gateway needs only an i18n label, so
// the page has no list of provider ids. The bank transfer details come first, because they give
// the switch of the backend and the deadline of the hint.
async function loadProviders(): Promise<void> {
  providerState.value = "loading"
  try {
    const details = await bankTransfer.getDetails()
    providers.value = await checkout.listPaymentProviders({
      bankTransferEnabled: details.enabled,
    })
    deadlineHours.value = details.deadline_hours
  } catch {
    providerState.value = "failed"
    return
  }
  if (!providers.value.some((provider) => provider.id === selectedProviderId.value)) {
    selectedProviderId.value = providers.value[0]?.id ?? null
  }
  providerState.value = "ready"
}

// The payment step opens when the cart has a shipping option. The region does not change, so the
// page loads the providers again only after a failed load.
watch(selectedOptionId, (optionId) => {
  if (optionId && (providerState.value === "idle" || providerState.value === "failed")) {
    loadProviders()
  }
})

// Starts the payment with the selected provider. A gateway sends the browser to its payment page.
// A provider with no payment page gives the order at once.
async function pay(): Promise<void> {
  // A second click can come before the disabled button renders. It must not start a second
  // payment.
  if (busy.value) {
    return
  }
  // A change after "Continue" removes the address. Pay only for the address in the cart.
  const recipient = sentAddress.value
  const providerId = selectedProviderId.value
  if (!recipient || !providerId) {
    return
  }
  busy.value = true
  placing.value = true
  message.value = null
  try {
    // The profile phone wins. Else the payment uses the phone of the delivery address.
    const start = await checkout.startPayment(
      providerId,
      toPaymentCustomer({ payer: customer.value, recipient, email: contact.email })
    )
    if (start.type === "redirect") {
      await navigateTo(start.url, { external: true })
    } else {
      await navigateTo(localePath(`/orders/${start.orderId}`))
    }
  } catch {
    // The form keeps its values, so that the customer can try again.
    message.value = "checkout.errors.payment"
  } finally {
    busy.value = false
    placing.value = false
  }
}

// The cart cookie is in the browser. Load the cart after the mount.
onMounted(async () => {
  try {
    await load()
  } catch {
    // The empty-cart text shows when the cart does not load.
  }
  ready.value = true
})

useHead({ title: () => t("checkout.title") })

// showShipping is true only after the customer saves a shipping option. Before that, cart.total
// has no delivery price. The totals above Place order use the same values as CheckoutSummary.
const showShipping = computed(() => !!selectedOptionId.value)
const savings = computed(() => cartSavings(cart.value?.items))

// Each "Continue" removes the options, so the waiting text shows again until the new options load.
const deliveryWaiting = computed(() =>
  !options.value.length && phase.value !== "shipping" ? t("checkout.shippingHint") : null
)
const paymentWaiting = computed(() => (selectedOptionId.value ? null : t("checkout.paymentLocked")))
const paymentState = computed(() =>
  providerState.value === "idle" ? "loading" : providerState.value
)
</script>
<template>
  <div class="pb-16 lg:pb-32">
    <div
      v-if="!ready"
      data-testid="checkout-skeleton"
      role="status"
      class="flex flex-col gap-12 pt-8 lg:max-w-[calc(100%-464px)] lg:pt-16"
    >
      <span class="sr-only">{{ $t("common.loading") }}</span>
      <Skeleton class="h-12 w-3/5" />
      <div v-for="section in 4" :key="section" class="flex flex-col">
        <Skeleton class="mb-4 h-8 w-2/5" />
        <div
          v-for="row in 2"
          :key="row"
          class="flex h-16 items-center gap-4 border-b border-border"
          aria-hidden="true"
        >
          <Skeleton class="size-[18px] shrink-0 rounded-full" />
          <Skeleton class="h-4 flex-1" />
        </div>
      </div>
    </div>

    <Empty v-else-if="!cart?.items?.length" class="py-16 md:py-24">
      <EmptyHeader>
        <EmptyMedia shape="disc">
          <ShoppingBag class="size-8" aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>
          <h1>{{ $t("cart.empty") }}</h1>
        </EmptyTitle>
        <EmptyDescription>{{ $t("cart.emptyBody") }}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button as-child>
          <NuxtLinkLocale to="/products">{{ $t("cart.continue") }}</NuxtLinkLocale>
        </Button>
      </EmptyContent>
    </Empty>

    <template v-else>
      <!-- Below 1024 px the summary is a bar at the full width of the screen, above the form. -->
      <CheckoutMobileBar :cart="cart" :show-shipping="showShipping" class="-mx-4 md:-mx-12" />

      <div
        class="grid items-start gap-12 pt-8 lg:grid-cols-[minmax(0,1fr)_400px] lg:gap-16 lg:pt-16"
      >
        <form
          novalidate
          class="flex min-w-0 flex-col gap-12 md:gap-16"
          @submit.prevent="submitAddress"
        >
          <h1 class="flex flex-col gap-3">
            <span class="hidden text-eyebrow text-muted-foreground lg:inline">
              {{ $t("checkout.title") }}
            </span>
            <span class="text-h1 lg:hidden">{{ $t("checkout.title") }}</span>
            <span class="hidden text-h1 lg:inline">{{ $t("checkout.heading") }}</span>
          </h1>

          <CheckoutSection :number="1" :title="$t('checkout.contact')">
            <template v-if="!customer" #aside>
              <p class="text-body-sm text-muted-foreground">
                {{ $t("checkout.guestPrompt") }}
                <NuxtLinkLocale
                  :to="signInTarget('/checkout')"
                  class="text-foreground underline decoration-1 underline-offset-4 hover:text-muted-foreground"
                  >{{ $t("checkout.guestLogin") }}</NuxtLinkLocale
                >
              </p>
            </template>
            <Field>
              <FieldLabel for="checkout-email">{{ $t("checkout.email") }}</FieldLabel>
              <Input
                id="checkout-email"
                v-model="contact.email"
                name="email"
                type="email"
                autocomplete="email"
                :disabled="busy"
                :aria-invalid="contactErrors.email ? true : undefined"
                aria-describedby="checkout-email-hint"
              />
              <FieldDescription id="checkout-email-hint">
                {{ $t("checkout.emailHint") }}
              </FieldDescription>
              <FieldError v-if="contactErrors.email">{{ $t(contactErrors.email) }}</FieldError>
            </Field>
          </CheckoutSection>

          <CheckoutSection :number="2" :title="$t('checkout.address')">
            <CheckoutAddressPicker
              v-if="customer"
              v-model:selected="selected"
              v-model:form="form"
              v-model:save="save"
              v-model:make-default="makeDefault"
              :addresses="addresses ?? []"
              :state="addressState"
              :errors="addressErrors"
              :disabled="busy"
              @retry="loadAddresses"
            />
            <AddressFields
              v-else
              v-model="form"
              id-prefix="checkout-address"
              :errors="addressErrors"
              :disabled="busy"
            />

            <Alert v-if="invalidAddress" variant="warning" data-testid="invalid-address">
              <TriangleAlert aria-hidden="true" />
              <AlertDescription>
                {{ $t("checkout.invalidAddress") }}
                <NuxtLinkLocale
                  to="/account/addresses"
                  class="underline decoration-1 underline-offset-4"
                  >{{ $t("checkout.manage") }}</NuxtLinkLocale
                >
              </AlertDescription>
            </Alert>

            <Alert v-if="addressNotSaved" variant="warning" data-testid="address-not-saved">
              <TriangleAlert aria-hidden="true" />
              <AlertDescription>{{ $t("checkout.addressNotSaved") }}</AlertDescription>
            </Alert>

            <p
              v-if="savedLabel"
              data-testid="address-saved"
              role="status"
              class="flex items-center gap-2 text-body-sm text-success"
            >
              <Check aria-hidden="true" class="size-4" />
              {{ $t("checkout.addressSaved", { label: savedLabel }) }}
            </p>

            <div>
              <Button
                type="submit"
                variant="outline"
                size="lg"
                class="w-full md:w-auto"
                :disabled="busy || continueBlocked"
                :aria-busy="phase ? true : undefined"
              >
                <Spinner v-if="phase" />
                {{ $t(continueLabel) }}
              </Button>
            </div>
          </CheckoutSection>

          <CheckoutSection
            :number="3"
            :title="$t('checkout.shippingOption')"
            :waiting="deliveryWaiting"
          >
            <CheckoutDeliveryRows
              :options="options"
              :selected-id="selectedOptionId"
              :loading="phase === 'shipping'"
              :disabled="busy"
              @select="chooseOption"
            />
          </CheckoutSection>

          <CheckoutSection :number="4" :title="$t('checkout.payment')" :waiting="paymentWaiting">
            <CheckoutPaymentRows
              v-model="selectedProviderId"
              :providers="providers"
              :state="paymentState"
              :deadline-hours="deadlineHours"
              :disabled="busy"
              @retry="loadProviders"
            />
          </CheckoutSection>

          <div class="flex flex-col gap-3 md:gap-4 md:border-t md:border-border md:pt-8">
            <div data-testid="mobile-totals" class="bg-card p-5 lg:hidden">
              <TotalsBlock
                :subtotal="cart.item_subtotal ?? 0"
                :savings="savings"
                :delivery="showShipping ? cart.shipping_total : null"
                :total="(showShipping ? cart.total : cart.item_total) ?? 0"
              />
            </div>

            <Button
              type="button"
              data-testid="pay"
              size="lg"
              class="w-full"
              :disabled="busy || !selectedOptionId || !selectedProviderId"
              :aria-busy="placing ? true : undefined"
              @click="pay"
            >
              <template v-if="placing">
                <Spinner />
                {{ $t("checkout.placing") }}
              </template>
              <template v-else>
                {{ $t("checkout.placeOrderTotal", { total: formatPrice(cart.total) }) }}
              </template>
            </Button>

            <i18n-t
              keypath="checkout.agree"
              tag="p"
              scope="global"
              class="text-center text-caption text-muted-foreground"
            >
              <template #terms>
                <NuxtLinkLocale to="/terms" class="underline underline-offset-4">{{
                  $t("checkout.termsLink")
                }}</NuxtLinkLocale>
              </template>
              <template #privacy>
                <NuxtLinkLocale to="/privacy" class="underline underline-offset-4">{{
                  $t("checkout.privacyLink")
                }}</NuxtLinkLocale>
              </template>
            </i18n-t>

            <Alert v-if="message" variant="destructive">
              <AlertDescription>{{ $t(message) }}</AlertDescription>
            </Alert>
          </div>
        </form>

        <aside
          aria-labelledby="checkout-summary-title"
          class="hidden bg-card p-8 lg:sticky lg:top-6 lg:block"
        >
          <CheckoutSummary :cart="cart" :show-shipping="showShipping" />
        </aside>
      </div>
    </template>
  </div>
</template>
