import { FetchError } from "@medusajs/js-sdk"
import { PencilSquare, Trash } from "@medusajs/icons"
import {
  Button,
  Container,
  Drawer,
  FocusModal,
  Heading,
  Hint,
  IconButton,
  Input,
  Label,
  Table,
  Text,
  toast,
  usePrompt,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { FormEvent, useEffect, useState } from "react"
import { isHexColour } from "../../modules/storefront/settings-rules"
import { AdminColour, ColourForm, toColourPayload, validateColourForm } from "../lib/colour-form"
import { sdk } from "../lib/sdk"

const COLOURS_KEY = ["storefront-colours"]

const EMPTY_FORM: ColourForm = { name: "", hex: "" }

type FormErrors = Partial<Record<keyof ColourForm, string>>

// Saves a new colour, or the colour with the id. The route answers 422 for a duplicate name, and
// the form shows that message under the Name field.
const useSaveColour = (
  id: string | null,
  onSaved: () => void,
  onNameError: (m: string) => void
) => {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (body: ColourForm) =>
      sdk.client.fetch(id ? `/admin/storefront/colours/${id}` : "/admin/storefront/colours", {
        method: "POST",
        body,
      }),
    onSuccess: async () => {
      toast.success(id ? "The colour is saved." : "The colour is added.")
      onSaved()
      await queryClient.invalidateQueries({ queryKey: COLOURS_KEY })
    },
    onError: (error) => {
      if (error instanceof FetchError && error.status === 422) {
        onNameError(error.message)
        return
      }
      toast.error("The colour was not saved. Try again.")
    },
  })
}

// The Name and Hex fields of the Add and Edit forms. The colour picker and the Hex field show
// the same value.
const ColourFields = ({
  idPrefix,
  form,
  errors,
  onChange,
}: {
  idPrefix: string
  form: ColourForm
  errors: FormErrors
  onChange: (form: ColourForm) => void
}) => {
  const hex = form.hex.trim().toLowerCase()
  return (
    <div className="flex flex-col gap-y-4">
      <div className="flex flex-col gap-y-2">
        <Label htmlFor={`${idPrefix}-name`} size="small" weight="plus">
          Name
        </Label>
        <Input
          id={`${idPrefix}-name`}
          maxLength={40}
          value={form.name}
          aria-invalid={Boolean(errors.name)}
          onChange={(event) => onChange({ ...form, name: event.target.value })}
        />
        <Hint>Use the colour name of the product option, for example Sand.</Hint>
        {errors.name && <Hint variant="error">{errors.name}</Hint>}
      </div>
      <div className="flex flex-col gap-y-2">
        <Label htmlFor={`${idPrefix}-hex`} size="small" weight="plus">
          Hex
        </Label>
        <div className="flex items-center gap-x-2">
          <input
            type="color"
            aria-label="Colour picker"
            className="border-ui-border-base h-8 w-10 shrink-0 cursor-pointer rounded-md border bg-transparent"
            value={isHexColour(hex) ? hex : "#000000"}
            onChange={(event) => onChange({ ...form, hex: event.target.value })}
          />
          <Input
            id={`${idPrefix}-hex`}
            className="font-mono"
            placeholder="#9aa68c"
            value={form.hex}
            aria-invalid={Boolean(errors.hex)}
            onChange={(event) => onChange({ ...form, hex: event.target.value })}
          />
        </div>
        <Hint>Use the format #rrggbb.</Hint>
        {errors.hex && <Hint variant="error">{errors.hex}</Hint>}
      </div>
    </div>
  )
}

const AddColourModal = ({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (o: boolean) => void
}) => {
  const [form, setForm] = useState<ColourForm>(EMPTY_FORM)
  const [errors, setErrors] = useState<FormErrors>({})
  const save = useSaveColour(
    null,
    () => onOpenChange(false),
    (name) => setErrors({ name })
  )

  useEffect(() => {
    if (open) {
      setForm(EMPTY_FORM)
      setErrors({})
    }
  }, [open])

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    const found = validateColourForm(form)
    setErrors(found)
    if (Object.keys(found).length === 0) {
      save.mutate(toColourPayload(form))
    }
  }

  return (
    <FocusModal open={open} onOpenChange={onOpenChange}>
      <FocusModal.Content>
        <form onSubmit={onSubmit} noValidate className="flex h-full flex-col overflow-hidden">
          <FocusModal.Header />
          <FocusModal.Body className="flex flex-1 justify-center overflow-auto px-6 py-16">
            <div className="flex w-full max-w-[560px] flex-col gap-y-8">
              <FocusModal.Title asChild>
                <Heading>Add colour</Heading>
              </FocusModal.Title>
              <FocusModal.Description className="sr-only">
                Add a store colour with a name and a hex.
              </FocusModal.Description>
              <ColourFields idPrefix="add-colour" form={form} errors={errors} onChange={setForm} />
            </div>
          </FocusModal.Body>
          <FocusModal.Footer>
            <FocusModal.Close asChild>
              <Button type="button" size="small" variant="secondary" disabled={save.isPending}>
                Cancel
              </Button>
            </FocusModal.Close>
            <Button type="submit" size="small" isLoading={save.isPending} disabled={save.isPending}>
              Save
            </Button>
          </FocusModal.Footer>
        </form>
      </FocusModal.Content>
    </FocusModal>
  )
}

const EditColourDrawer = ({
  colour,
  onClose,
}: {
  colour: AdminColour | null
  onClose: () => void
}) => {
  const [form, setForm] = useState<ColourForm>(EMPTY_FORM)
  const [errors, setErrors] = useState<FormErrors>({})
  const save = useSaveColour(colour?.id ?? null, onClose, (name) => setErrors({ name }))

  useEffect(() => {
    if (colour) {
      setForm({ name: colour.name, hex: colour.hex })
      setErrors({})
    }
  }, [colour])

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    const found = validateColourForm(form)
    setErrors(found)
    if (Object.keys(found).length === 0) {
      save.mutate(toColourPayload(form))
    }
  }

  return (
    <Drawer open={colour !== null} onOpenChange={(open) => !open && onClose()}>
      <Drawer.Content>
        <form onSubmit={onSubmit} noValidate className="flex flex-1 flex-col overflow-hidden">
          <Drawer.Header>
            <Drawer.Title asChild>
              <Heading>Edit colour</Heading>
            </Drawer.Title>
            <Drawer.Description className="sr-only">
              Change the name or the hex of the colour.
            </Drawer.Description>
          </Drawer.Header>
          <Drawer.Body className="flex-1 overflow-auto">
            <ColourFields idPrefix="edit-colour" form={form} errors={errors} onChange={setForm} />
          </Drawer.Body>
          <Drawer.Footer>
            <Drawer.Close asChild>
              <Button type="button" size="small" variant="secondary" disabled={save.isPending}>
                Cancel
              </Button>
            </Drawer.Close>
            <Button type="submit" size="small" isLoading={save.isPending} disabled={save.isPending}>
              Save
            </Button>
          </Drawer.Footer>
        </form>
      </Drawer.Content>
    </Drawer>
  )
}

// The store colours. The storefront finds the hex of a colour dot here by the colour name.
export const ColoursSection = () => {
  const queryClient = useQueryClient()
  const prompt = usePrompt()
  const [adding, setAdding] = useState(false)
  const [editing, setEditing] = useState<AdminColour | null>(null)

  const { data, isLoading, isError } = useQuery<{ colours: AdminColour[] }>({
    queryKey: COLOURS_KEY,
    queryFn: () => sdk.client.fetch("/admin/storefront/colours"),
  })
  const colours = data?.colours ?? []

  const remove = useMutation({
    mutationFn: (id: string) =>
      sdk.client.fetch(`/admin/storefront/colours/${id}`, { method: "DELETE" }),
    onSuccess: async () => {
      toast.success("The colour is deleted.")
      await queryClient.invalidateQueries({ queryKey: COLOURS_KEY })
    },
    onError: () => toast.error("The colour was not deleted. Try again."),
  })

  const onDelete = async (colour: AdminColour) => {
    const confirmed = await prompt({
      title: `Delete the colour ${colour.name}?`,
      description:
        "Products that use this colour name show no colour dot, unless the product has its own hex.",
      confirmText: "Delete",
      cancelText: "Cancel",
    })
    if (confirmed) {
      remove.mutate(colour.id)
    }
  }

  const addButton = (
    <Button type="button" size="small" variant="secondary" onClick={() => setAdding(true)}>
      Add
    </Button>
  )

  return (
    <Container className="divide-y p-0">
      <div className="flex items-start justify-between gap-x-4 px-6 py-4">
        <div>
          <Heading level="h2">Colours</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            The storefront shows a colour dot for each colour value of a product. It finds the hex
            here by the colour name.
          </Text>
        </div>
        {colours.length > 0 && addButton}
      </div>
      {isLoading ? (
        <Text size="small" className="px-6 py-4">
          Loading the colours.
        </Text>
      ) : isError ? (
        <Text size="small" className="px-6 py-4">
          The colours did not load. Reload the page.
        </Text>
      ) : colours.length === 0 ? (
        <div className="flex flex-col items-center gap-y-3 px-6 py-10 text-center">
          <div>
            <Text size="small" leading="compact" weight="plus">
              No colours
            </Text>
            <Text size="small" className="text-ui-fg-subtle">
              Add a colour to show a colour dot for the products that use the colour name.
            </Text>
          </div>
          {addButton}
        </div>
      ) : (
        <Table>
          <Table.Header>
            <Table.Row>
              <Table.HeaderCell>Name</Table.HeaderCell>
              <Table.HeaderCell>Swatch</Table.HeaderCell>
              <Table.HeaderCell>Hex</Table.HeaderCell>
              <Table.HeaderCell>
                <span className="sr-only">Actions</span>
              </Table.HeaderCell>
            </Table.Row>
          </Table.Header>
          <Table.Body>
            {colours.map((colour) => (
              <Table.Row key={colour.id}>
                <Table.Cell>{colour.name}</Table.Cell>
                <Table.Cell>
                  <span
                    aria-hidden
                    className="border-ui-border-base block h-5 w-5 rounded-full border"
                    style={{ backgroundColor: colour.hex }}
                  />
                </Table.Cell>
                <Table.Cell className="font-mono">{colour.hex}</Table.Cell>
                <Table.Cell>
                  <div className="flex justify-end gap-x-1">
                    <IconButton
                      size="small"
                      variant="transparent"
                      aria-label={`Edit ${colour.name}`}
                      onClick={() => setEditing(colour)}
                    >
                      <PencilSquare />
                    </IconButton>
                    <IconButton
                      size="small"
                      variant="transparent"
                      aria-label={`Delete ${colour.name}`}
                      disabled={remove.isPending}
                      onClick={() => onDelete(colour)}
                    >
                      <Trash />
                    </IconButton>
                  </div>
                </Table.Cell>
              </Table.Row>
            ))}
          </Table.Body>
        </Table>
      )}
      <AddColourModal open={adding} onOpenChange={setAdding} />
      <EditColourDrawer colour={editing} onClose={() => setEditing(null)} />
    </Container>
  )
}
