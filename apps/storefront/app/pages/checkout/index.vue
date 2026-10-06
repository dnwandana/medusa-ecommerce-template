<script setup lang="ts">
import { CreditCard, ShoppingBag } from "@lucide/vue"
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

// The stepper shows the progress only. The form state gives the step.
const currentStep = computed<1 | 2 | 3>(() =>
  selectedOptionId.value ? 3 : options.value.length ? 2 : 1
)

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
            <CardContent>
              <FieldGroup class="two-col">
                <Field v-for="field in contactFields" :key="field.name">
                  <FieldLabel :for="`checkout-${field.name}`">{{ $t(field.label) }}</FieldLabel>
                  <Input
                    :id="`checkout-${field.name}`"
                    v-model="values[field.name]"
                    :name="field.name"
                    :type="field.type"
                    :autocomplete="field.autocomplete"
                    :aria-invalid="errors[field.name] ? true : undefined"
                  />
                  <FieldError v-if="errors[field.name]">{{ $t(errors[field.name]!) }}</FieldError>
                </Field>
              </FieldGroup>
            </CardContent>

            <CardHeader class="pt-0 md:pt-0">
              <CardTitle
                ><h2>{{ $t("checkout.address") }}</h2></CardTitle
              >
            </CardHeader>
            <CardContent>
              <FieldGroup class="two-col">
                <!-- The street address is long, so it uses the full width of the grid. -->
                <Field
                  v-for="field in addressFields"
                  :key="field.name"
                  :class="{ 'md:col-span-2': field.name === 'address_1' }"
                >
                  <FieldLabel :for="`checkout-${field.name}`">{{ $t(field.label) }}</FieldLabel>
                  <Input
                    :id="`checkout-${field.name}`"
                    v-model="values[field.name]"
                    :name="field.name"
                    :type="field.type"
                    :autocomplete="field.autocomplete"
                    :aria-invalid="errors[field.name] ? true : undefined"
                  />
                  <FieldError v-if="errors[field.name]">{{ $t(errors[field.name]!) }}</FieldError>
                </Field>
                <Field class="justify-end">
                  <p class="text-body-sm text-muted-foreground">{{ $t("checkout.country") }}</p>
                </Field>
              </FieldGroup>
            </CardContent>

            <CardFooter>
              <Button type="submit" variant="outline" size="lg" :disabled="busy">
                <Spinner v-if="busy" />
                {{ $t("checkout.continue") }}
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
