import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Trash } from "@medusajs/icons"
import {
  Button,
  Container,
  Heading,
  Hint,
  IconButton,
  Input,
  Label,
  Table,
  Text,
  Toaster,
  toast,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { FormEvent, ReactNode, useEffect, useState } from "react"
import { ColoursSection } from "../../../components/colours-section"
import {
  formatRupiah,
  parseAmount,
  parseSettingsForm,
  rangeLabel,
  SettingsSection,
  StorefrontSettingsBody,
  toSettingsForm,
} from "../../../lib/storefront-form"
import { sdk } from "../../../lib/sdk"

const SETTINGS_KEY = ["storefront-settings"]

// Sends the saved settings with the field of one section replaced, then reloads the settings.
const useSaveSettings = (successText: string) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: StorefrontSettingsBody) =>
      sdk.client.fetch<{ settings: StorefrontSettingsBody }>("/admin/storefront/settings", {
        method: "POST",
        body,
      }),
    onSuccess: async () => {
      toast.success(successText)
      await queryClient.invalidateQueries({ queryKey: SETTINGS_KEY })
    },
    // The form keeps the typed values, so staff can correct them and save again.
    onError: () => toast.error("The settings were not saved. Try again."),
  })
}

const SectionHeader = ({
  title,
  text,
  action,
}: {
  title: string
  text: string
  action?: ReactNode
}) => (
  <div className="flex items-start justify-between gap-x-4 px-6 py-4">
    <div>
      <Heading level="h2">{title}</Heading>
      <Text size="small" className="text-ui-fg-subtle">
        {text}
      </Text>
    </div>
    {action}
  </div>
)

const SaveFooter = ({ isPending }: { isPending: boolean }) => (
  <div className="flex justify-end px-6 py-4">
    <Button type="submit" size="small" isLoading={isPending} disabled={isPending}>
      Save
    </Button>
  </div>
)

// One whole-number setting with its own Save button: the New badge or the Limited stock badge.
const NumberSection = ({
  saved,
  section,
  field,
  title,
  text,
  label,
  hint,
  successText,
}: {
  saved: StorefrontSettingsBody
  section: Exclude<SettingsSection, "price_ranges">
  field: "new_badge_days" | "low_stock_threshold"
  title: string
  text: string
  label: string
  hint: string
  successText: string
}) => {
  const [value, setValue] = useState(String(saved[field]))
  const [error, setError] = useState<string | undefined>()
  const save = useSaveSettings(successText)

  // Only a change of this saved value resets the field. A save of another section keeps the
  // typed value.
  useEffect(() => {
    setValue(String(saved[field]))
    setError(undefined)
  }, [saved[field]])

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    const form = { ...toSettingsForm(saved), [field]: value }
    const { body, errors } = parseSettingsForm(form, section, saved)
    setError(errors[field])
    if (body) {
      save.mutate(body)
    }
  }

  const id = `storefront-${field}`
  return (
    <Container className="divide-y p-0">
      <SectionHeader title={title} text={text} />
      <form onSubmit={onSubmit} noValidate className="divide-y">
        <div className="flex flex-col gap-y-2 px-6 py-4">
          <Label htmlFor={id} size="small" weight="plus">
            {label}
          </Label>
          <Input
            id={id}
            className="max-w-[160px]"
            inputMode="numeric"
            value={value}
            aria-invalid={Boolean(error)}
            aria-describedby={`${id}-hint`}
            onChange={(event) => setValue(event.target.value)}
          />
          <Hint id={`${id}-hint`}>{hint}</Hint>
          {error && <Hint variant="error">{error}</Hint>}
        </div>
        <SaveFooter isPending={save.isPending} />
      </form>
    </Container>
  )
}

// The price ranges of the Price filter. Staff edit only the "To" amount of each range. The
// "From" of a range is the "To" of the range above it. The last range has no maximum.
const PriceRangesSection = ({ saved }: { saved: StorefrontSettingsBody }) => {
  const [limits, setLimits] = useState(() => toSettingsForm(saved).limits)
  const [errors, setErrors] = useState<Record<number, string>>({})
  const save = useSaveSettings("The price ranges are saved.")
  const savedKey = saved.price_limits.join(",")

  useEffect(() => {
    setLimits(toSettingsForm(saved).limits)
    setErrors({})
  }, [savedKey])

  const amounts = limits.map(parseAmount)

  const addRange = () => setLimits([...limits, ""])

  // A delete of the last range removes the last limit, so the range above it gets no maximum.
  const deleteRange = (index: number) => {
    setLimits(
      limits.length <= 1 ? [] : limits.filter((_, i) => i !== Math.min(index, limits.length - 1))
    )
    setErrors({})
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    const result = parseSettingsForm({ ...toSettingsForm(saved), limits }, "price_ranges", saved)
    setErrors(result.errors.limits ?? {})
    if (result.body) {
      save.mutate(result.body)
    }
  }

  // The label shows only when the "From" and the "To" of the row are valid amounts.
  const rowLabel = (index: number) => {
    const isFirst = index === 0
    const isLast = index === limits.length
    const from = isFirst ? null : amounts[index - 1]
    const to = isLast ? null : amounts[index]
    if ((!isFirst && from === null) || (!isLast && to === null)) {
      return null
    }
    if (from !== null && to !== null && to <= from) {
      return null
    }
    return rangeLabel(from, to)
  }

  return (
    <Container className="divide-y p-0">
      <SectionHeader
        title="Price ranges"
        text="The Price filter on the category page shows these ranges. Each range starts at the end of the range above it."
        action={
          limits.length > 0 && (
            <Button type="button" size="small" variant="secondary" onClick={addRange}>
              Add range
            </Button>
          )
        }
      />
      <form onSubmit={onSubmit} noValidate className="divide-y">
        {limits.length === 0 ? (
          <div className="flex flex-col items-center gap-y-3 px-6 py-10 text-center">
            <div>
              <Text size="small" leading="compact" weight="plus">
                No price ranges
              </Text>
              <Text size="small" className="text-ui-fg-subtle">
                The storefront hides the Price filter until you add a range.
              </Text>
            </div>
            <Button type="button" size="small" variant="secondary" onClick={addRange}>
              Add range
            </Button>
          </div>
        ) : (
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>From</Table.HeaderCell>
                <Table.HeaderCell>To</Table.HeaderCell>
                <Table.HeaderCell>Label in the storefront</Table.HeaderCell>
                <Table.HeaderCell>
                  <span className="sr-only">Actions</span>
                </Table.HeaderCell>
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {[...limits, null].map((limit, index) => {
                const from = index === 0 ? null : amounts[index - 1]
                const label = rowLabel(index)
                return (
                  <Table.Row key={index}>
                    <Table.Cell>
                      {index === 0 ? "No minimum" : from === null ? "–" : formatRupiah(from)}
                    </Table.Cell>
                    <Table.Cell className="py-2">
                      {limit === null ? (
                        <Text size="small" className="text-ui-fg-subtle">
                          No maximum
                        </Text>
                      ) : (
                        <div className="flex flex-col gap-y-1">
                          <div className="relative max-w-[200px]">
                            <span className="text-ui-fg-muted txt-compact-small pointer-events-none absolute inset-y-0 left-3 flex items-center">
                              Rp
                            </span>
                            <Input
                              className="pl-9"
                              inputMode="numeric"
                              value={limit}
                              aria-label={`To, range ${index + 1}`}
                              aria-invalid={Boolean(errors[index])}
                              onChange={(event) =>
                                setLimits(
                                  limits.map((item, i) => (i === index ? event.target.value : item))
                                )
                              }
                              onBlur={() => {
                                const amount = parseAmount(limit)
                                if (amount !== null) {
                                  setLimits(
                                    limits.map((item, i) =>
                                      i === index ? formatRupiah(amount).slice(3) : item
                                    )
                                  )
                                }
                              }}
                            />
                          </div>
                          {errors[index] && <Hint variant="error">{errors[index]}</Hint>}
                        </div>
                      )}
                    </Table.Cell>
                    <Table.Cell>
                      {label ? (
                        <Text size="small">
                          {label.en} <span className="text-ui-fg-subtle">· {label.id}</span>
                        </Text>
                      ) : (
                        <Text size="small" className="text-ui-fg-subtle">
                          No label
                        </Text>
                      )}
                    </Table.Cell>
                    <Table.Cell>
                      <div className="flex justify-end">
                        <IconButton
                          type="button"
                          size="small"
                          variant="transparent"
                          aria-label={`Delete range ${index + 1}`}
                          onClick={() => deleteRange(index)}
                        >
                          <Trash />
                        </IconButton>
                      </div>
                    </Table.Cell>
                  </Table.Row>
                )
              })}
            </Table.Body>
          </Table>
        )}
        {/* Save shows also with no range, so staff can save the delete of the last range. */}
        {(limits.length > 0 || saved.price_limits.length > 0) && (
          <SaveFooter isPending={save.isPending} />
        )}
      </form>
    </Container>
  )
}

const StorefrontSettingsPage = () => {
  const { data, isLoading, isError } = useQuery<{ settings: StorefrontSettingsBody }>({
    queryKey: SETTINGS_KEY,
    queryFn: () => sdk.client.fetch("/admin/storefront/settings"),
  })
  const saved = data?.settings

  return (
    <div className="flex flex-col gap-y-3">
      {isLoading ? (
        <Container className="px-6 py-4">
          <Text size="small">Loading the storefront settings.</Text>
        </Container>
      ) : isError || !saved ? (
        <Container className="px-6 py-4">
          <Text size="small">The storefront settings did not load. Reload the page.</Text>
        </Container>
      ) : (
        <>
          <NumberSection
            saved={saved}
            section="new_badge"
            field="new_badge_days"
            title="New badge"
            text="The storefront shows the New badge on a product for a number of days after its creation date."
            label="Days a product shows as New"
            hint="0 turns off the badge."
            successText="The New badge is saved."
          />
          <NumberSection
            saved={saved}
            section="low_stock"
            field="low_stock_threshold"
            title="Limited stock badge"
            text="The storefront shows the Limited stock badge on a product when its total stock is at or below this number."
            label="Low stock threshold"
            hint="0 turns off the badge. Products that do not track stock, or that allow backorders, never show the badge."
            successText="The Limited stock badge is saved."
          />
          <ColoursSection />
          <PriceRangesSection saved={saved} />
        </>
      )}
      <Toaster />
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Storefront",
})

export default StorefrontSettingsPage
