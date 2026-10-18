// The customer statuses of payment base part 2. Replace this type with the import of
// `CustomerStatus` from `orderStatus.ts` when that file exists.
export type CustomerStatus =
  | "waiting_for_payment"
  | "payment_submitted"
  | "processing"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "refunded"

export type TrackerStepId = "confirmed" | "on_its_way" | "delivered"

export type TrackerCaption = "waiting_for_payment" | "checking_receipt" | "partly_shipped"

export type TrackerStep = {
  id: TrackerStepId
  complete: boolean
  current: boolean
  date: string | null
  caption: TrackerCaption | null
}

type DateValue = string | Date | null | undefined

// The fields of a Store order that the tracker reads.
export type TrackerOrder = {
  created_at: string | Date
  fulfillment_status?: string | null
  fulfillments?:
    { shipped_at?: DateValue; delivered_at?: DateValue; canceled_at?: DateValue }[] | null
  payment_collections?: { payments?: { captured_at?: DateValue }[] | null }[] | null
}

const CONFIRMED_STATUSES: CustomerStatus[] = ["processing", "shipped", "delivered"]
const ON_ITS_WAY_FULFILLMENT = ["shipped", "partially_delivered", "delivered"]
const PARTLY_SHIPPED_FULFILLMENT = ["partially_shipped", "partially_delivered"]

// Returns the earliest or the latest date as an ISO string. The comparison uses Date values,
// because two ISO strings with different formats do not sort as text.
function pickDate(values: DateValue[], pick: "earliest" | "latest"): string | null {
  const times = values.flatMap((value) => {
    const time = value ? new Date(value).getTime() : NaN
    return Number.isNaN(time) ? [] : [time]
  })
  if (times.length === 0) return null
  const time = pick === "earliest" ? Math.min(...times) : Math.max(...times)
  return new Date(time).toISOString()
}

function confirmedCaption(status: CustomerStatus): TrackerCaption | null {
  if (status === "waiting_for_payment") return "waiting_for_payment"
  if (status === "payment_submitted") return "checking_receipt"
  return null
}

// Returns the three tracker steps in the order Confirmed, On its way, Delivered. The first step
// that is not complete is the current step.
export function trackerSteps(order: TrackerOrder, status: CustomerStatus): TrackerStep[] {
  const fulfillmentStatus = order.fulfillment_status ?? ""
  // A canceled fulfillment never gives a date.
  const fulfillments = (order.fulfillments ?? []).filter((fulfillment) => !fulfillment.canceled_at)
  const captures = (order.payment_collections ?? []).flatMap((collection) =>
    (collection.payments ?? []).map((payment) => payment.captured_at)
  )

  const confirmed = CONFIRMED_STATUSES.includes(status)
  const onItsWay = ON_ITS_WAY_FULFILLMENT.includes(fulfillmentStatus)
  const delivered = fulfillmentStatus === "delivered"

  const steps: Omit<TrackerStep, "current">[] = [
    {
      id: "confirmed",
      complete: confirmed,
      date: confirmed
        ? (pickDate(captures, "earliest") ?? new Date(order.created_at).toISOString())
        : null,
      caption: confirmedCaption(status),
    },
    {
      id: "on_its_way",
      complete: onItsWay,
      date: onItsWay
        ? pickDate(
            fulfillments.map((fulfillment) => fulfillment.shipped_at),
            "latest"
          )
        : null,
      caption: PARTLY_SHIPPED_FULFILLMENT.includes(fulfillmentStatus) ? "partly_shipped" : null,
    },
    {
      id: "delivered",
      complete: delivered,
      date: delivered
        ? pickDate(
            fulfillments.map((fulfillment) => fulfillment.delivered_at),
            "latest"
          )
        : null,
      caption: null,
    },
  ]

  const currentIndex = steps.findIndex((step) => !step.complete)
  return steps.map((step, index) => ({ ...step, current: index === currentIndex }))
}

const TIME_ZONE = "Asia/Jakarta"

const intlLocale = (locale: string): string => (locale.startsWith("id") ? "id-ID" : "en-GB")

// Returns "17 October 2026" for en and "17 Oktober 2026" for id, in Jakarta time.
export function formatOrderDate(value: string | Date, locale: string): string {
  return new Intl.DateTimeFormat(intlLocale(locale), {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: TIME_ZONE,
  }).format(new Date(value))
}

// Returns "18 Oct, 10:15" in Jakarta time. The text comes from the parts, so the comma and the
// colon are the same in both languages.
export function formatStepTime(value: string | Date, locale: string): string {
  const parts = new Intl.DateTimeFormat(intlLocale(locale), {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: TIME_ZONE,
  }).formatToParts(new Date(value))
  const part = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((item) => item.type === type)?.value ?? ""
  return `${part("day")} ${part("month")}, ${part("hour")}:${part("minute")}`
}
