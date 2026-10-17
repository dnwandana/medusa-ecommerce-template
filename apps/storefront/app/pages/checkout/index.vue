<script setup lang="ts">
import { Check, CreditCard, ShoppingBag, TriangleAlert } from "@lucide/vue"
import type { HttpTypes } from "@medusajs/types"
import type { AddressListState } from "~/components/CheckoutAddressPicker.vue"
import type { ShippingChoice } from "~/composables/useCheckout"
import type { AddressErrors, AddressFormValues, CartAddress } from "~/utils/addressForm"
import { NEW_ADDRESS } from "~/utils/addressForm"
import type { ContactValues } from "~/utils/checkoutForm"

const { t } = useI18n()
const { cart, load } = useCart()
const { customer } = useCustomer()
const checkout = useCheckout()
const { addresses, load: loadSavedAddresses, create: createAddress } = useAddresses()

const contact = reactive<ContactValues>({ email: "", phone: "" })
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
// The step of "Continue" that runs now. The button shows its text.
const phase = ref<"saving" | "shipping" | null>(null)
// An address id, or NEW_ADDRESS.
const selected = ref<string>(NEW_ADDRESS)
const save = ref(true)
const makeDefault = ref(false)
const addressState = ref<AddressListState>("loading")
// True when "Continue" stopped at a saved address that does not pass the validation.
const invalidAddress = ref(false)
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

type ContactField = {
  name: keyof ContactValues
  label: string
  type: string
  autocomplete: string
}

const contactFields: ContactField[] = [
  { name: "email", label: "checkout.email", type: "email", autocomplete: "email" },
  { name: "phone", label: "checkout.phone", type: "tel", autocomplete: "tel" },
]

// Copies the data of the logged-in customer into the contact fields that are empty.
function fill(current: HttpTypes.StoreCustomer): void {
  for (const name of ["email", "phone"] as const) {
    const value = current[name]
    if (!contact[name] && value) {
      contact[name] = value
    }
  }
}

// Fills the form with the first name, the last name, and the phone of the profile. Other fields "".
// The Medusa profile can have null values, and the inputs need a string.
function resetForm(): void {
  const current = customer.value
  form.value = {
    ...emptyAddressForm(),
    first_name: current?.first_name ?? "",
    last_name: current?.last_name ?? "",
    phone: current?.phone ?? "",
  }
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

// The stepper shows the progress only. The form state gives the step.
const currentStep = computed<1 | 2 | 3>(() =>
  selectedOptionId.value ? 3 : options.value.length ? 2 : 1
)

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

  if (!customer.value) {
    addressErrors.value = validateAddressForm(form.value, { phone: false })
    if (Object.keys(contactErrors.value).length || Object.keys(addressErrors.value).length) {
      return null
    }
    // The guest form has no phone field. The cart address gets the contact phone.
    return toCartAddress({ ...form.value, phone: contact.phone })
  }

  if (formOpen.value) {
    addressErrors.value = validateAddressForm(form.value, { phone: true })
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
  if (!values || Object.keys(validateAddressForm(values, { phone: true })).length) {
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

// Starts the Mayar payment and leaves the storefront.
async function pay(): Promise<void> {
  // A change after "Continue" removes the address. Pay only for the address in the cart.
  const recipient = sentAddress.value
  if (!recipient) {
    return
  }
  busy.value = true
  message.value = null
  try {
    // The Mayar invoice uses the contact phone, because each address can have its own phone.
    const url = await checkout.startPayment(
      toMayarCustomer({
        payer: customer.value,
        recipient,
        email: contact.email,
        phone: contact.phone,
      })
    )
    await navigateTo(url, { external: true })
  } catch {
    // The form keeps its values, so that the customer can try again.
    message.value = "checkout.errors.payment"
  } finally {
    busy.value = false
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

// The Alert component has no warning variant. These classes give the warning colors of the spec.
const WARNING_CLASS =
  "border-[#efd7a8] bg-warning-soft text-warning *:data-[slot=alert-description]:text-warning"
</script>

<template>
  <div class="flex flex-col gap-6">
    <h1 class="text-h1">{{ $t("checkout.title") }}</h1>

    <p v-if="!ready" role="status">{{ $t("common.loading") }}</p>

    <Empty v-else-if="!cart?.items?.length" variant="outline">
      <EmptyHeader>
        <EmptyMedia>
          <ShoppingBag aria-hidden="true" />
        </EmptyMedia>
        <EmptyTitle>{{ $t("cart.empty") }}</EmptyTitle>
        <EmptyDescription>{{ $t("cart.emptyBody") }}</EmptyDescription>
      </EmptyHeader>
      <EmptyContent>
        <Button as-child>
          <NuxtLinkLocale to="/products">{{ $t("cart.continue") }}</NuxtLinkLocale>
        </Button>
      </EmptyContent>
    </Empty>

    <div v-else class="grid items-start gap-6 md:grid-cols-[minmax(0,1fr)_400px] md:gap-12">
      <div class="flex min-w-0 flex-col gap-6">
        <CheckoutStepper :current="currentStep" />

        <form novalidate class="flex flex-col gap-6" @submit.prevent="submitAddress">
          <Card>
            <CardHeader>
              <CardTitle
                ><h2>{{ $t("checkout.contact") }}</h2></CardTitle
              >
            </CardHeader>
            <CardContent class="flex flex-col gap-4">
              <p v-if="!customer" class="text-body-sm text-muted-foreground">
                {{ $t("checkout.guestPrompt") }}
                <NuxtLinkLocale
                  to="/account/login?redirect=/checkout"
                  class="font-medium text-foreground underline underline-offset-4"
                  >{{ $t("checkout.guestLogin") }}</NuxtLinkLocale
                >
              </p>
              <FieldGroup class="two-col">
                <Field v-for="field in contactFields" :key="field.name">
                  <FieldLabel :for="`checkout-${field.name}`">{{ $t(field.label) }}</FieldLabel>
                  <Input
                    :id="`checkout-${field.name}`"
                    v-model="contact[field.name]"
                    :name="field.name"
                    :type="field.type"
                    :autocomplete="field.autocomplete"
                    :disabled="busy"
                    :aria-invalid="contactErrors[field.name] ? true : undefined"
                  />
                  <FieldError v-if="contactErrors[field.name]">{{
                    $t(contactErrors[field.name]!)
                  }}</FieldError>
                </Field>
              </FieldGroup>
            </CardContent>

            <CardHeader class="pt-0 md:pt-0">
              <CardTitle
                ><h2>{{ $t("checkout.address") }}</h2></CardTitle
              >
            </CardHeader>
            <CardContent class="flex flex-col gap-4">
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
                :phone="false"
                :disabled="busy"
              />

              <Alert v-if="invalidAddress" data-testid="invalid-address" :class="WARNING_CLASS">
                <TriangleAlert aria-hidden="true" />
                <AlertDescription>
                  {{ $t("checkout.invalidAddress") }}
                  <NuxtLinkLocale
                    to="/account/addresses"
                    class="font-medium text-foreground underline underline-offset-4"
                    >{{ $t("checkout.manage") }}</NuxtLinkLocale
                  >
                </AlertDescription>
              </Alert>

              <Alert v-if="addressNotSaved" data-testid="address-not-saved" :class="WARNING_CLASS">
                <TriangleAlert aria-hidden="true" />
                <AlertDescription>{{ $t("checkout.addressNotSaved") }}</AlertDescription>
              </Alert>

              <p
                v-if="savedLabel"
                data-testid="address-saved"
                role="status"
                class="flex items-center gap-1.5 text-body-sm font-medium text-success"
              >
                <Check aria-hidden="true" class="size-4" />
                {{ $t("checkout.addressSaved", { label: savedLabel }) }}
              </p>
            </CardContent>

            <CardFooter>
              <Button type="submit" variant="outline" size="lg" :disabled="busy || continueBlocked">
                <Spinner v-if="busy" />
                {{ $t(continueLabel) }}
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle
                ><h2>{{ $t("checkout.shippingOption") }}</h2></CardTitle
              >
            </CardHeader>
            <CardContent>
              <p v-if="!options.length" class="text-body-sm text-muted-foreground">
                {{ $t("checkout.shippingHint") }}
              </p>
              <RadioGroup
                v-else
                name="shipping_option"
                :model-value="selectedOptionId ?? undefined"
                :disabled="busy"
                @update:model-value="(value) => chooseOption(String(value))"
              >
                <label
                  v-for="option in options"
                  :key="option.id"
                  class="flex cursor-pointer items-center gap-3 rounded-lg border border-border bg-card px-4 py-3.5 has-data-[state=checked]:border-primary has-data-[state=checked]:bg-primary-soft has-data-[state=checked]:shadow-[inset_0_0_0_1px_var(--color-primary)]"
                >
                  <RadioGroupItem :id="`shipping-${option.id}`" :value="option.id" />
                  <span class="grow font-medium">{{ option.name }}</span>
                  <span class="text-price">{{ formatPrice(option.amount) }}</span>
                </label>
              </RadioGroup>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle
                ><h2>{{ $t("checkout.payment") }}</h2></CardTitle
              >
            </CardHeader>
            <CardContent class="flex flex-col gap-4">
              <Item variant="outline">
                <ItemMedia class="size-11 rounded-full bg-muted">
                  <CreditCard aria-hidden="true" class="size-5" />
                </ItemMedia>
                <ItemContent>
                  <ItemTitle>Mayar</ItemTitle>
                  <ItemDescription>{{ $t("checkout.mayarHint") }}</ItemDescription>
                </ItemContent>
              </Item>
              <Button
                type="button"
                data-testid="pay"
                size="lg"
                class="w-full"
                :disabled="busy || !selectedOptionId"
                @click="pay"
              >
                {{ $t("checkout.pay") }}
              </Button>
            </CardContent>
          </Card>

          <Alert v-if="message" variant="destructive">
            <AlertDescription>{{ $t(message) }}</AlertDescription>
          </Alert>
        </form>
      </div>

      <aside class="order-first md:order-none md:sticky md:top-6">
        <CheckoutSummary :cart="cart" :show-shipping="!!selectedOptionId" />
      </aside>
    </div>
  </div>
</template>
