<script setup lang="ts">
import type { HttpTypes } from "@medusajs/types"
import type { ShippingChoice } from "~/composables/useCheckout"
import type { CheckoutFormValues } from "~/utils/checkoutForm"

const { t } = useI18n()
const { cart, load } = useCart()
const { customer } = useCustomer()
const checkout = useCheckout()

const values = reactive<CheckoutFormValues>({
  email: "",
  phone: "",
  first_name: "",
  last_name: "",
  address_1: "",
  city: "",
  province: "",
  postal_code: "",
})
const errors = ref<Partial<Record<keyof CheckoutFormValues, string>>>({})
const options = ref<ShippingChoice[]>([])
const selectedOptionId = ref<string | null>(null)
// A message key of the group checkout.errors, or null.
const message = ref<string | null>(null)
const ready = ref(false)
const busy = ref(false)

type Field = {
  name: keyof CheckoutFormValues
  label: string
  type: string
  autocomplete: string
}

const contactFields: Field[] = [
  { name: "email", label: "checkout.email", type: "email", autocomplete: "email" },
  { name: "phone", label: "checkout.phone", type: "tel", autocomplete: "tel" },
]

const addressFields: Field[] = [
  { name: "first_name", label: "checkout.firstName", type: "text", autocomplete: "given-name" },
  { name: "last_name", label: "checkout.lastName", type: "text", autocomplete: "family-name" },
  { name: "address_1", label: "checkout.address1", type: "text", autocomplete: "address-line1" },
  { name: "city", label: "checkout.city", type: "text", autocomplete: "address-level2" },
  { name: "province", label: "checkout.province", type: "text", autocomplete: "address-level1" },
  { name: "postal_code", label: "checkout.postalCode", type: "text", autocomplete: "postal-code" },
]

// Copies the data of the logged-in customer into the fields that are empty.
function fill(current: HttpTypes.StoreCustomer | null): void {
  if (!current) {
    return
  }
  for (const name of ["email", "first_name", "last_name", "phone"] as const) {
    const value = current[name]
    if (!values[name] && value) {
      values[name] = value
    }
  }
}

watch(customer, fill, { immediate: true })

// A change after "Continue" makes the saved address old and the values not checked. Remove the
// shipping choice, so that the customer must select "Continue" again before the payment.
watch(values, () => {
  options.value = []
  selectedOptionId.value = null
})

// Checks the form, saves the address, and loads the shipping options.
async function submitAddress(): Promise<void> {
  busy.value = true
  try {
    message.value = null
    options.value = []
    selectedOptionId.value = null

    errors.value = validateCheckoutForm(values)
    if (Object.keys(errors.value).length > 0) {
      return
    }

    try {
      await checkout.saveContact({ ...values })
    } catch {
      message.value = "checkout.errors.save"
      return
    }

    try {
      options.value = await checkout.loadShippingOptions()
    } catch {
      message.value = "checkout.errors.shipping"
      return
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
  busy.value = true
  message.value = null
  try {
    const url = await checkout.startPayment(toMayarCustomer(values))
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
</script>

<template>
  <div class="flex flex-col gap-6">
    <h1 class="text-2xl font-semibold">{{ $t("checkout.title") }}</h1>

    <p v-if="!ready">{{ $t("common.loading") }}</p>

    <div v-else-if="!cart?.items?.length" class="flex flex-col items-start gap-2">
      <p>{{ $t("cart.empty") }}</p>
      <NuxtLinkLocale to="/products" class="underline underline-offset-4">
        {{ $t("cart.continue") }}
      </NuxtLinkLocale>
    </div>

    <form v-else novalidate class="flex flex-col gap-6" @submit.prevent="submitAddress">
      <Card class="px-4">
        <h2 class="text-lg font-semibold">{{ $t("checkout.contact") }}</h2>
        <div v-for="field in contactFields" :key="field.name" class="flex flex-col gap-2">
          <Label :for="`checkout-${field.name}`">{{ $t(field.label) }}</Label>
          <Input
            :id="`checkout-${field.name}`"
            v-model="values[field.name]"
            :name="field.name"
            :type="field.type"
            :autocomplete="field.autocomplete"
            :aria-invalid="errors[field.name] ? true : undefined"
          />
          <p v-if="errors[field.name]" role="alert" class="text-sm text-destructive">
            {{ $t(errors[field.name]!) }}
          </p>
        </div>

        <h2 class="text-lg font-semibold">{{ $t("checkout.address") }}</h2>
        <div v-for="field in addressFields" :key="field.name" class="flex flex-col gap-2">
          <Label :for="`checkout-${field.name}`">{{ $t(field.label) }}</Label>
          <Input
            :id="`checkout-${field.name}`"
            v-model="values[field.name]"
            :name="field.name"
            :type="field.type"
            :autocomplete="field.autocomplete"
            :aria-invalid="errors[field.name] ? true : undefined"
          />
          <p v-if="errors[field.name]" role="alert" class="text-sm text-destructive">
            {{ $t(errors[field.name]!) }}
          </p>
        </div>
        <p class="text-sm text-muted-foreground">{{ $t("checkout.country") }}</p>

        <div>
          <Button type="submit" :disabled="busy">{{ $t("checkout.continue") }}</Button>
        </div>
      </Card>

      <Card class="px-4">
        <h2 class="text-lg font-semibold">{{ $t("checkout.shippingOption") }}</h2>
        <label
          v-for="option in options"
          :key="option.id"
          class="flex items-center gap-2 text-sm"
        >
          <input
            type="radio"
            name="shipping_option"
            :value="option.id"
            :checked="selectedOptionId === option.id"
            :disabled="busy"
            @change="chooseOption(option.id)"
          >
          <span>{{ option.name }}</span>
          <span class="ml-auto">{{ formatPrice(option.amount) }}</span>
        </label>

        <dl class="grid w-full max-w-sm grid-cols-2 gap-2">
          <dt>{{ $t("cart.subtotal") }}</dt>
          <dd class="text-right">{{ formatPrice(cart.item_subtotal) }}</dd>
          <template v-if="selectedOptionId">
            <dt>{{ $t("cart.shipping") }}</dt>
            <dd class="text-right">{{ formatPrice(cart.shipping_total) }}</dd>
            <dt class="font-semibold">{{ $t("cart.total") }}</dt>
            <dd class="text-right font-semibold">{{ formatPrice(cart.total) }}</dd>
          </template>
        </dl>
      </Card>

      <Card class="px-4">
        <h2 class="text-lg font-semibold">{{ $t("checkout.payment") }}</h2>
        <p class="text-sm text-muted-foreground">{{ $t("checkout.mayarHint") }}</p>
        <div>
          <Button
            type="button"
            data-testid="pay"
            :disabled="busy || !selectedOptionId"
            @click="pay"
          >
            {{ $t("checkout.pay") }}
          </Button>
        </div>
      </Card>

      <p v-if="message" role="alert" class="text-destructive">{{ $t(message) }}</p>
    </form>
  </div>
</template>
