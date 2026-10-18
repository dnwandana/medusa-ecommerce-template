import { defineWidgetConfig } from "@medusajs/admin-sdk"
import type { DetailWidgetProps, HttpTypes } from "@medusajs/framework/types"
import { ArrowPath, EllipsisHorizontal, PencilSquare } from "@medusajs/icons"
import {
  Button,
  Container,
  Drawer,
  DropdownMenu,
  Heading,
  Hint,
  IconButton,
  Input,
  Label,
  Text,
  toast,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { FormEvent, useState } from "react"
import { isColourOption } from "../../lib/option-names"
import { readColourHex } from "../../lib/storefront-metadata"
import { AdminColour } from "../lib/colour-form"
import {
  ColourDotRow,
  colourDotRows,
  parseHex,
  SOURCE_LABELS,
  withColourHex,
} from "../lib/colour-dots"
import { sdk } from "../lib/sdk"

// The same key as the Colours section of Settings → Storefront, so both share one cache entry.
const COLOURS_KEY = ["storefront-colours"]

const Dot = ({ hex }: { hex: string | null }) =>
  hex ? (
    <span
      aria-hidden
      className="border-ui-border-base block h-5 w-5 shrink-0 rounded-full border"
      style={{ backgroundColor: hex }}
    />
  ) : (
    <span
      aria-hidden
      className="border-ui-border-strong block h-5 w-5 shrink-0 rounded-full border border-dashed"
    />
  )

// Lists the colour dots of the product and lets staff set a hex for this product only. The hex
// goes to the product metadata, so a shared option does not change the other products.
const ColourDotsWidget = ({ data: product }: DetailWidgetProps<HttpTypes.AdminProduct>) => {
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<ColourDotRow | null>(null)
  const [hexInput, setHexInput] = useState("")
  const [error, setError] = useState<string | null>(null)

  const options = (product.options ?? []).map((option) => ({
    title: option.title,
    values: (option.values ?? []).map((value) => ({ value: value.value })),
  }))
  const hasColourOption = options.some((option) => isColourOption(option.title))

  const { data, isLoading } = useQuery<{ colours: AdminColour[] }>({
    queryKey: COLOURS_KEY,
    queryFn: () => sdk.client.fetch("/admin/storefront/colours"),
    enabled: hasColourOption,
  })

  const rows = colourDotRows(options, readColourHex(product.metadata), data?.colours ?? [])

  const save = useMutation({
    mutationFn: ({ value, hex }: { value: string; hex: string | null }) =>
      sdk.admin.product.update(product.id, {
        metadata: withColourHex(product.metadata, value, hex),
      }),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["product", product.id] }),
        queryClient.invalidateQueries({ queryKey: ["products"] }),
      ])
      toast.success("The colour dot is saved.")
      setEditing(null)
    },
    onError: () => toast.error("The colour dot was not saved. Try again."),
  })

  if (!hasColourOption) {
    return null
  }

  const openEdit = (row: ColourDotRow) => {
    setHexInput(row.source === "product" ? (row.hex ?? "") : "")
    setError(null)
    setEditing(row)
  }

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!editing) {
      return
    }
    const result = parseHex(hexInput)
    setError(result.error)
    if (result.hex) {
      save.mutate({ value: editing.value, hex: result.hex })
    }
  }

  const resetToStoreList = (row: ColourDotRow) => save.mutate({ value: row.value, hex: null })

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h2">Colour dots</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          The storefront shows these dots on the product cards and the product page.
        </Text>
      </div>
      {isLoading ? (
        <Text size="small" className="px-6 py-4">
          Loading the colours.
        </Text>
      ) : (
        <ul className="divide-y">
          {rows.map((row) => (
            <li key={row.value} className="flex items-center gap-x-3 px-6 py-3">
              <Dot hex={row.hex} />
              <div className="flex min-w-0 flex-1 flex-col">
                <Text size="small" leading="compact" weight="plus">
                  {row.value}
                </Text>
                <Text size="small" leading="compact" className="text-ui-fg-subtle">
                  <span className="font-mono">{row.hex ?? "-"}</span> · {SOURCE_LABELS[row.source]}
                </Text>
              </div>
              <DropdownMenu>
                <DropdownMenu.Trigger asChild>
                  <IconButton
                    size="small"
                    variant="transparent"
                    aria-label={`Actions for ${row.value}`}
                    disabled={save.isPending}
                  >
                    <EllipsisHorizontal />
                  </IconButton>
                </DropdownMenu.Trigger>
                <DropdownMenu.Content>
                  <DropdownMenu.Item className="gap-x-2" onClick={() => openEdit(row)}>
                    <PencilSquare className="text-ui-fg-subtle" />
                    Edit
                  </DropdownMenu.Item>
                  {row.source === "product" && (
                    <DropdownMenu.Item className="gap-x-2" onClick={() => resetToStoreList(row)}>
                      <ArrowPath className="text-ui-fg-subtle" />
                      Use the store list
                    </DropdownMenu.Item>
                  )}
                </DropdownMenu.Content>
              </DropdownMenu>
            </li>
          ))}
        </ul>
      )}
      <Drawer open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <Drawer.Content>
          <form onSubmit={onSubmit} noValidate className="flex flex-1 flex-col overflow-hidden">
            <Drawer.Header>
              <Drawer.Title asChild>
                <Heading>Edit colour dot</Heading>
              </Drawer.Title>
              <Drawer.Description className="sr-only">
                Set a hex for this colour on this product only.
              </Drawer.Description>
            </Drawer.Header>
            {editing && (
              <Drawer.Body className="flex flex-1 flex-col gap-y-6 overflow-auto">
                <div className="grid grid-cols-[120px_1fr] items-center gap-y-3">
                  <Text size="small" weight="plus">
                    Colour
                  </Text>
                  <Text size="small">{editing.value}</Text>
                  <Text size="small" weight="plus">
                    Current source
                  </Text>
                  <div className="flex items-center gap-x-2">
                    <Dot hex={editing.hex} />
                    <Text size="small">
                      {SOURCE_LABELS[editing.source]}
                      {editing.hex ? ` (${editing.hex})` : ""}
                    </Text>
                  </div>
                </div>
                <div className="flex flex-col gap-y-2">
                  <Label htmlFor="colour-dot-hex" size="small" weight="plus">
                    Hex for this product
                  </Label>
                  <Input
                    id="colour-dot-hex"
                    className="font-mono"
                    placeholder={editing.hex ?? "#9aa68c"}
                    value={hexInput}
                    aria-invalid={Boolean(error)}
                    onChange={(event) => setHexInput(event.target.value)}
                  />
                  <Hint>Use the format #rrggbb. Only this product uses this hex.</Hint>
                  {error && <Hint variant="error">{error}</Hint>}
                </div>
              </Drawer.Body>
            )}
            <Drawer.Footer>
              {editing?.source === "product" && (
                <Button
                  type="button"
                  size="small"
                  variant="secondary"
                  className="mr-auto"
                  disabled={save.isPending}
                  onClick={() => resetToStoreList(editing)}
                >
                  Use the store list
                </Button>
              )}
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
  zone: "product.details.side",
})

export default ColourDotsWidget
