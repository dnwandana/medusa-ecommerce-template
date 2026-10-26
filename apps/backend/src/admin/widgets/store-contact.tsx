import { defineWidgetConfig } from "@medusajs/admin-sdk"
import { ArrowDownMini, ArrowUpMini, PencilSquare, Plus, Trash } from "@medusajs/icons"
import {
  Button,
  Container,
  Drawer,
  Heading,
  Hint,
  IconButton,
  Input,
  Label,
  Select,
  Text,
  Textarea,
  toast,
  usePrompt,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { FormEvent, useEffect, useState } from "react"
import { SOCIAL_NETWORKS } from "../../lib/social-networks"
import {
  ADDRESS_MAX_LENGTH,
  type SocialLink,
  SOCIAL_LINKS_MAX,
  type StoreContact,
} from "../../lib/store-contact"
import {
  type ContactForm,
  moveLink,
  socialNetworkName,
  toContactForm,
  toContactPayload,
  validateContactForm,
  validateSocialLink,
} from "../lib/store-contact-form"
import { sdk } from "../lib/sdk"

const CONTACT_KEY = ["store-contact"]

const EMPTY_FORM: ContactForm = { email: "", phone: "", whatsapp: "", address: "" }

const FIELDS: { name: keyof ContactForm; label: string }[] = [
  { name: "email", label: "Email" },
  { name: "phone", label: "Phone" },
  { name: "whatsapp", label: "WhatsApp" },
  { name: "address", label: "Address" },
]

// The route sends its validation text in the error message, for example "Invalid request: ...".
const errorText = (error: unknown): string =>
  error instanceof Error && error.message ? error.message : "The request failed. Try again."

type DrawerProps<T> = {
  open: boolean
  onOpenChange(open: boolean): void
  initial: T
  onSubmit(value: T): Promise<void>
  busy: boolean
}

// Edits the four contact fields. The caller sends the whole contact with the saved links.
const ContactDrawer = ({
  open,
  onOpenChange,
  initial,
  onSubmit,
  busy,
}: DrawerProps<ContactForm>) => {
  const [form, setForm] = useState<ContactForm>(EMPTY_FORM)
  const [errors, setErrors] = useState<Partial<Record<keyof ContactForm, string>>>({})
  const [serverError, setServerError] = useState<string | null>(null)

  // Each open starts from the saved contact, so a cancelled edit leaves no typed values.
  useEffect(() => {
    if (open) {
      setForm(initial)
      setErrors({})
      setServerError(null)
    }
  }, [open, initial])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const found = validateContactForm(form)
    setErrors(found)
    setServerError(null)
    if (Object.keys(found).length > 0) {
      return
    }
    try {
      await onSubmit(form)
    } catch (error) {
      // The drawer keeps the typed values, so the owner can correct them and save again.
      setServerError(errorText(error))
    }
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <Drawer.Content>
        <form onSubmit={submit} noValidate className="flex flex-1 flex-col overflow-hidden">
          <Drawer.Header>
            <Drawer.Title asChild>
              <Heading>Edit contact</Heading>
            </Drawer.Title>
            <Drawer.Description className="sr-only">
              Edit the email, the phone, the WhatsApp number, and the address of the store.
            </Drawer.Description>
          </Drawer.Header>
          <Drawer.Body className="flex flex-1 flex-col gap-y-4 overflow-auto">
            {FIELDS.map((field) => {
              const id = `store-contact-${field.name}`
              const isNumber = field.name === "phone" || field.name === "whatsapp"
              return (
                <div key={field.name} className="flex flex-col gap-y-2">
                  <Label htmlFor={id} size="small" weight="plus">
                    {field.label} (Optional)
                  </Label>
                  {field.name === "address" ? (
                    <Textarea
                      id={id}
                      rows={4}
                      value={form.address}
                      aria-invalid={Boolean(errors.address)}
                      onChange={(event) => setForm({ ...form, address: event.target.value })}
                    />
                  ) : (
                    <Input
                      id={id}
                      type={field.name === "email" ? "email" : "tel"}
                      placeholder={isNumber ? "+62 812 3456 7890" : undefined}
                      value={form[field.name]}
                      aria-invalid={Boolean(errors[field.name])}
                      onChange={(event) => setForm({ ...form, [field.name]: event.target.value })}
                    />
                  )}
                  {isNumber && !errors[field.name] && (
                    <Hint>Start with + and the country code.</Hint>
                  )}
                  {field.name === "address" && (
                    <Text size="xsmall" className="text-ui-fg-muted self-end">
                      {form.address.trim().length} / {ADDRESS_MAX_LENGTH}
                    </Text>
                  )}
                  {errors[field.name] && <Hint variant="error">{errors[field.name]}</Hint>}
                </div>
              )
            })}
            {serverError && <Hint variant="error">{serverError}</Hint>}
          </Drawer.Body>
          <Drawer.Footer>
            <Drawer.Close asChild>
              <Button type="button" size="small" variant="secondary" disabled={busy}>
                Cancel
              </Button>
            </Drawer.Close>
            <Button type="submit" size="small" isLoading={busy} disabled={busy}>
              Save
            </Button>
          </Drawer.Footer>
        </form>
      </Drawer.Content>
    </Drawer>
  )
}

// Adds a social link, or edits one. The caller puts the link into the list and sends the list.
const LinkDrawer = ({
  open,
  onOpenChange,
  initial,
  onSubmit,
  busy,
  title,
}: DrawerProps<SocialLink> & { title: string }) => {
  const [link, setLink] = useState<SocialLink>(initial)
  const [error, setError] = useState<string | null>(null)
  const [serverError, setServerError] = useState<string | null>(null)

  useEffect(() => {
    if (open) {
      setLink(initial)
      setError(null)
      setServerError(null)
    }
  }, [open, initial])

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const problem = validateSocialLink(link)
    setError(problem)
    setServerError(null)
    if (problem) {
      return
    }
    try {
      await onSubmit({ network: link.network, url: link.url.trim() })
    } catch (failure) {
      setServerError(errorText(failure))
    }
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <Drawer.Content>
        <form onSubmit={submit} noValidate className="flex flex-1 flex-col overflow-hidden">
          <Drawer.Header>
            <Drawer.Title asChild>
              <Heading>{title}</Heading>
            </Drawer.Title>
            <Drawer.Description className="sr-only">
              Select the network and enter the https link to the store page.
            </Drawer.Description>
          </Drawer.Header>
          <Drawer.Body className="flex flex-1 flex-col gap-y-4 overflow-auto">
            <div className="flex flex-col gap-y-2">
              <Label htmlFor="social-link-network" size="small" weight="plus">
                Network
              </Label>
              <Select
                value={link.network}
                onValueChange={(network) => setLink({ ...link, network })}
              >
                <Select.Trigger id="social-link-network">
                  <Select.Value placeholder="Select a network" />
                </Select.Trigger>
                <Select.Content>
                  {SOCIAL_NETWORKS.map((network) => (
                    <Select.Item key={network.id} value={network.id}>
                      {network.name}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
            </div>
            <div className="flex flex-col gap-y-2">
              <Label htmlFor="social-link-url" size="small" weight="plus">
                Link
              </Label>
              <Input
                id="social-link-url"
                type="url"
                placeholder="https://"
                value={link.url}
                aria-invalid={Boolean(error)}
                onChange={(event) => setLink({ ...link, url: event.target.value })}
              />
              {error && <Hint variant="error">{error}</Hint>}
            </div>
            {serverError && <Hint variant="error">{serverError}</Hint>}
          </Drawer.Body>
          <Drawer.Footer>
            <Drawer.Close asChild>
              <Button type="button" size="small" variant="secondary" disabled={busy}>
                Cancel
              </Button>
            </Drawer.Close>
            <Button type="submit" size="small" isLoading={busy} disabled={busy}>
              Save
            </Button>
          </Drawer.Footer>
        </form>
      </Drawer.Content>
    </Drawer>
  )
}

const NEW_LINK: SocialLink = { network: SOCIAL_NETWORKS[0].id, url: "" }

// Shows and edits the store contact on Settings → Store. The emails and the storefront read the
// contact. Each save sends the whole contact, because POST /admin/store-contact replaces it.
const StoreContactWidget = () => {
  const queryClient = useQueryClient()
  const prompt = usePrompt()
  // Each drawer gets a copy of the values at open time. A refetch of the contact then does not
  // reset the typed values. null: the drawer is closed.
  const [contactDraft, setContactDraft] = useState<ContactForm | null>(null)
  // index null: the drawer adds a link. A number: the drawer edits the link at that index.
  const [linkDraft, setLinkDraft] = useState<{ index: number | null; link: SocialLink } | null>(
    null
  )

  const { data, isLoading, isError } = useQuery<{ contact: StoreContact }>({
    queryKey: CONTACT_KEY,
    queryFn: () => sdk.client.fetch("/admin/store-contact"),
  })
  const contact = data?.contact
  const links = contact?.social_links ?? []
  const form = contact ? toContactForm(contact) : EMPTY_FORM

  const save = useMutation({
    mutationFn: (body: StoreContact) =>
      sdk.client.fetch<{ contact: StoreContact }>("/admin/store-contact", {
        method: "POST",
        body,
      }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: CONTACT_KEY }),
  })

  const saveLinks = (next: SocialLink[]) => save.mutateAsync(toContactPayload(form, next))

  const onSaveContact = async (value: ContactForm) => {
    await save.mutateAsync(toContactPayload(value, links))
    toast.success("The contact is saved.")
    setContactDraft(null)
  }

  const onSaveLink = async (link: SocialLink) => {
    const editIndex = linkDraft?.index ?? null
    const next =
      editIndex === null
        ? [...links, link]
        : links.map((item, index) => (index === editIndex ? link : item))
    await saveLinks(next)
    toast.success("The social link is saved.")
    setLinkDraft(null)
  }

  const onMove = (index: number, direction: "up" | "down") => {
    saveLinks(moveLink(links, index, direction)).catch(() =>
      toast.error("The order was not changed. Try again.")
    )
  }

  const onDelete = async (index: number) => {
    const link = links[index]
    const confirmed = await prompt({
      title: "Delete the social link?",
      description: `The storefront will not show the ${socialNetworkName(link.network)} link ${link.url}.`,
      confirmText: "Delete",
      cancelText: "Cancel",
    })
    if (!confirmed) {
      return
    }
    try {
      await saveLinks(links.filter((_, i) => i !== index))
      toast.success("The social link is deleted.")
    } catch {
      toast.error("The social link was not deleted. Try again.")
    }
  }

  const status = isLoading
    ? "Loading the store contact."
    : isError
      ? "The store contact did not load. Refresh the page."
      : null

  return (
    <div className="flex flex-col gap-y-3">
      <Container className="divide-y p-0">
        <div className="flex items-start justify-between gap-x-4 px-6 py-4">
          <div>
            <Heading level="h2">Contact</Heading>
            <Text size="small" className="text-ui-fg-subtle">
              The storefront and the customer emails show this contact.
            </Text>
          </div>
          <Button
            type="button"
            size="small"
            variant="secondary"
            disabled={!contact}
            onClick={() => setContactDraft(form)}
          >
            Edit
          </Button>
        </div>
        {status ? (
          <Text size="small" className="px-6 py-4">
            {status}
          </Text>
        ) : (
          FIELDS.map((field) => (
            <div key={field.name} className="grid grid-cols-[1fr_2fr] gap-x-4 px-6 py-4">
              <Text size="small" leading="compact" weight="plus">
                {field.label}
              </Text>
              <Text
                size="small"
                leading="compact"
                className="whitespace-pre-line break-words text-ui-fg-subtle"
              >
                {form[field.name] || "—"}
              </Text>
            </div>
          ))
        )}
      </Container>

      <Container className="divide-y p-0">
        <div className="flex items-start justify-between gap-x-4 px-6 py-4">
          <div>
            <Heading level="h2">Social links</Heading>
            <Text size="small" className="text-ui-fg-subtle">
              The storefront shows the links in this order. You can add up to {SOCIAL_LINKS_MAX}{" "}
              links.
            </Text>
          </div>
          <Button
            type="button"
            size="small"
            variant="secondary"
            disabled={!contact || links.length >= SOCIAL_LINKS_MAX}
            onClick={() => setLinkDraft({ index: null, link: NEW_LINK })}
          >
            <Plus />
            Add
          </Button>
        </div>
        {status ? (
          <Text size="small" className="px-6 py-4">
            {status}
          </Text>
        ) : links.length === 0 ? (
          <Text size="small" className="px-6 py-4 text-ui-fg-subtle">
            There are no social links.
          </Text>
        ) : (
          links.map((link, index) => (
            <div key={index} className="flex items-center justify-between gap-x-4 px-6 py-4">
              <div className="min-w-0">
                <Text size="small" leading="compact" weight="plus">
                  {socialNetworkName(link.network)}
                </Text>
                <Text size="small" leading="compact" className="break-all text-ui-fg-subtle">
                  {link.url}
                </Text>
              </div>
              <div className="flex shrink-0 gap-x-1">
                <IconButton
                  size="small"
                  variant="transparent"
                  aria-label={`Move up ${socialNetworkName(link.network)} link ${index + 1}`}
                  disabled={index === 0 || save.isPending}
                  onClick={() => onMove(index, "up")}
                >
                  <ArrowUpMini />
                </IconButton>
                <IconButton
                  size="small"
                  variant="transparent"
                  aria-label={`Move down ${socialNetworkName(link.network)} link ${index + 1}`}
                  disabled={index === links.length - 1 || save.isPending}
                  onClick={() => onMove(index, "down")}
                >
                  <ArrowDownMini />
                </IconButton>
                <IconButton
                  size="small"
                  variant="transparent"
                  aria-label={`Edit ${socialNetworkName(link.network)} link ${index + 1}`}
                  disabled={save.isPending}
                  onClick={() => setLinkDraft({ index, link })}
                >
                  <PencilSquare />
                </IconButton>
                <IconButton
                  size="small"
                  variant="transparent"
                  aria-label={`Delete ${socialNetworkName(link.network)} link ${index + 1}`}
                  disabled={save.isPending}
                  onClick={() => onDelete(index)}
                >
                  <Trash />
                </IconButton>
              </div>
            </div>
          ))
        )}
      </Container>

      <ContactDrawer
        open={contactDraft !== null}
        onOpenChange={(open) => !open && setContactDraft(null)}
        initial={contactDraft ?? EMPTY_FORM}
        onSubmit={onSaveContact}
        busy={save.isPending}
      />
      <LinkDrawer
        open={linkDraft !== null}
        onOpenChange={(open) => !open && setLinkDraft(null)}
        initial={linkDraft?.link ?? NEW_LINK}
        onSubmit={onSaveLink}
        busy={save.isPending}
        title={linkDraft?.index === null ? "Add social link" : "Edit social link"}
      />
    </div>
  )
}

export const config = defineWidgetConfig({
  zone: "store.details.after",
})

export default StoreContactWidget
