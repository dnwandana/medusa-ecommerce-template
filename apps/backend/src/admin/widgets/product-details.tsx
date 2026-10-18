import { defineWidgetConfig } from "@medusajs/admin-sdk"
import type { DetailWidgetProps, HttpTypes } from "@medusajs/framework/types"
import { EllipsisHorizontal, PencilSquare, Plus, Trash } from "@medusajs/icons"
import {
  Button,
  Container,
  Drawer,
  DropdownMenu,
  Heading,
  Hint,
  IconButton,
  Input,
  Text,
  toast,
} from "@medusajs/ui"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { FormEvent, useState } from "react"
import { type ProductDetails, readProductDetails } from "../../lib/storefront-metadata"
import {
  DetailsForm,
  fabricFromTags,
  LineRow,
  parseDetailsForm,
  toDetailsForm,
  withProductDetails,
} from "../lib/product-details-form"
import { sdk } from "../lib/sdk"

type Group = keyof DetailsForm

const GROUPS: { key: Group; title: string }[] = [
  { key: "details", title: "Details and fit" },
  { key: "care", title: "Fabric and care" },
]

const NO_ERRORS = { details: {}, care: {} }

// The rows of one group in the Drawer: an English field, an optional Bahasa Indonesia field and
// a remove button on each row.
const LineGroup = ({
  group,
  title,
  hint,
  rows,
  errors,
  onChange,
}: {
  group: Group
  title: string
  hint: string
  rows: LineRow[]
  errors: Record<number, string>
  onChange: (rows: LineRow[]) => void
}) => {
  const setRow = (index: number, row: LineRow) =>
    onChange(rows.map((item, i) => (i === index ? row : item)))

  return (
    <div
      role="group"
      aria-labelledby={`product-details-${group}`}
      className="flex flex-col gap-y-3"
    >
      <div>
        <Text id={`product-details-${group}`} size="small" leading="compact" weight="plus">
          {title}
        </Text>
        <Hint>{hint}</Hint>
      </div>
      {rows.length > 0 && (
        <div className="grid grid-cols-[1fr_1fr_28px] gap-x-2">
          <Text size="xsmall" weight="plus" className="text-ui-fg-subtle">
            English
          </Text>
          <Text size="xsmall" weight="plus" className="text-ui-fg-subtle">
            Bahasa Indonesia (Optional)
          </Text>
        </div>
      )}
      {rows.map((row, index) => (
        <div key={index} className="flex flex-col gap-y-1">
          <div className="grid grid-cols-[1fr_1fr_28px] items-center gap-x-2">
            <Input
              aria-label={`${title}, English, line ${index + 1}`}
              aria-invalid={Boolean(errors[index])}
              value={row.en}
              onChange={(event) => setRow(index, { ...row, en: event.target.value })}
            />
            <Input
              aria-label={`${title}, Bahasa Indonesia, line ${index + 1}`}
              value={row.id}
              onChange={(event) => setRow(index, { ...row, id: event.target.value })}
            />
            <IconButton
              type="button"
              size="small"
              variant="transparent"
              aria-label={`Remove line ${index + 1} of ${title}`}
              onClick={() => onChange(rows.filter((_, i) => i !== index))}
            >
              <Trash />
            </IconButton>
          </div>
          {errors[index] && <Hint variant="error">{errors[index]}</Hint>}
        </div>
      ))}
      <div>
        <Button
          type="button"
          size="small"
          variant="secondary"
          onClick={() => onChange([...rows, { en: "", id: "" }])}
        >
          <Plus />
          Add line
        </Button>
      </div>
    </div>
  )
}

// Shows and edits the "Details and fit" and "Fabric and care" lines of the product page. The
// lines are in the product metadata, so the backend needs no new table.
const ProductDetailsWidget = ({ data: product }: DetailWidgetProps<HttpTypes.AdminProduct>) => {
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<DetailsForm>({ details: [], care: [] })
  const [errors, setErrors] = useState<{
    details: Record<number, string>
    care: Record<number, string>
  }>(NO_ERRORS)

  const saved = readProductDetails(product.metadata)
  const fabric = fabricFromTags(product.tags)
  const isEmpty = saved.details.length === 0 && saved.care.length === 0

  const save = useMutation({
    mutationFn: (value: ProductDetails) =>
      sdk.admin.product.update(product.id, {
        metadata: withProductDetails(product.metadata, value),
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["product", product.id] }),
        queryClient.invalidateQueries({ queryKey: ["products"] }),
      ])
      toast.success("The product details are saved.")
      setOpen(false)
    },
    // The Drawer stays open with the typed lines, so staff can save again.
    onError: () => toast.error("The product details were not saved. Try again."),
  })

  const openDrawer = () => {
    setForm(toDetailsForm(saved))
    setErrors(NO_ERRORS)
    setOpen(true)
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    const result = parseDetailsForm(form)
    setErrors(result.errors)
    if (result.value) {
      save.mutate(result.value)
    }
  }

  // A new or a removed row moves the row indexes, so the old errors of the group no longer match.
  const setRows = (group: Group, rows: LineRow[]) => {
    if (rows.length !== form[group].length) {
      setErrors({ ...errors, [group]: {} })
    }
    setForm({ ...form, [group]: rows })
  }

  const careHint = fabric
    ? `The product page shows the fabric tag (${fabric}) first. Type the care lines here.`
    : "Type the care lines here."

  return (
    <Container className="divide-y p-0">
      <div className="flex items-start justify-between gap-x-4 px-6 py-4">
        <div>
          <Heading level="h2">Product details</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            The product page shows these lines under "Details and fit" and "Fabric and care".
          </Text>
        </div>
        {!isEmpty && (
          <DropdownMenu>
            <DropdownMenu.Trigger asChild>
              <IconButton size="small" variant="transparent" aria-label="Product details actions">
                <EllipsisHorizontal />
              </IconButton>
            </DropdownMenu.Trigger>
            <DropdownMenu.Content>
              <DropdownMenu.Item className="gap-x-2" onClick={openDrawer}>
                <PencilSquare className="text-ui-fg-subtle" />
                Edit
              </DropdownMenu.Item>
            </DropdownMenu.Content>
          </DropdownMenu>
        )}
      </div>
      {isEmpty ? (
        <div className="flex flex-col items-center gap-y-3 px-6 py-8 text-center">
          <div>
            <Text size="small" leading="compact" weight="plus">
              No product details
            </Text>
            <Text size="small" className="text-ui-fg-subtle">
              The product page hides "Details and fit". "Fabric and care" shows only the fabric tag.
            </Text>
          </div>
          <Button type="button" size="small" variant="secondary" onClick={openDrawer}>
            Add lines
          </Button>
        </div>
      ) : (
        GROUPS.map((group) => {
          const lines = saved[group.key].map((line) => line.en)
          if (group.key === "care" && fabric) {
            lines.unshift(fabric)
          }
          return (
            <div key={group.key} className="grid grid-cols-[1fr_2fr] gap-x-4 px-6 py-4">
              <Text size="small" leading="compact" weight="plus">
                {group.title}
              </Text>
              {lines.length === 0 ? (
                <Text size="small" className="text-ui-fg-subtle">
                  -
                </Text>
              ) : (
                <ul className="flex flex-col gap-y-1">
                  {lines.map((line, index) => (
                    <li key={index}>
                      <Text size="small">{line}</Text>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )
        })
      )}
      <Drawer open={open} onOpenChange={setOpen}>
        <Drawer.Content>
          <form onSubmit={onSubmit} noValidate className="flex flex-1 flex-col overflow-hidden">
            <Drawer.Header>
              <Drawer.Title asChild>
                <Heading>Edit product details</Heading>
              </Drawer.Title>
              <Drawer.Description className="sr-only">
                Edit the lines of "Details and fit" and "Fabric and care".
              </Drawer.Description>
            </Drawer.Header>
            <Drawer.Body className="flex flex-1 flex-col gap-y-8 overflow-auto">
              <LineGroup
                group="details"
                title="Details and fit"
                hint="For example the fit, a length, or the model size."
                rows={form.details}
                errors={errors.details}
                onChange={(rows) => setRows("details", rows)}
              />
              <LineGroup
                group="care"
                title="Fabric and care"
                hint={careHint}
                rows={form.care}
                errors={errors.care}
                onChange={(rows) => setRows("care", rows)}
              />
            </Drawer.Body>
            <Drawer.Footer>
              <Drawer.Close asChild>
                <Button type="button" size="small" variant="secondary" disabled={save.isPending}>
                  Cancel
                </Button>
              </Drawer.Close>
              <Button
                type="submit"
                size="small"
                isLoading={save.isPending}
                disabled={save.isPending}
              >
                Save
              </Button>
            </Drawer.Footer>
          </form>
        </Drawer.Content>
      </Drawer>
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product.details",
})

export default ProductDetailsWidget
