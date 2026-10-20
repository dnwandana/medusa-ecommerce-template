import { Button, Drawer, Heading, Hint, Label, Text, Textarea } from "@medusajs/ui"
import { FormEvent, useState } from "react"
import { validateOptionalNote } from "../lib/payment-receipts"

// validateOptionalNote in lib/payment-receipts.ts uses the same limit.
const NOTE_LIMIT = 500

type CancelOrderDrawerProps = {
  open: boolean
  onOpenChange(open: boolean): void
  onSubmit(note: string): Promise<void>
  busy: boolean
}

// Asks the owner to confirm the cancellation. The optional note goes into the cancellation email,
// so the customer can see why the store cancelled the order.
export const CancelOrderDrawer = ({
  open,
  onOpenChange,
  onSubmit,
  busy,
}: CancelOrderDrawerProps) => {
  const [note, setNote] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [tried, setTried] = useState(false)

  const onChange = (value: string) => {
    setNote(value)
    // After the first send, the error follows the text, so the owner sees when it is correct.
    if (tried) {
      setError(validateOptionalNote(value))
    }
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setTried(true)
    const problem = validateOptionalNote(note)
    setError(problem)
    if (problem) {
      return
    }
    try {
      await onSubmit(note.trim())
      setNote("")
      setTried(false)
    } catch {
      // The caller shows the error. The textarea keeps the text, so the owner can send it again.
    }
  }

  return (
    <Drawer open={open} onOpenChange={onOpenChange}>
      <Drawer.Content>
        <form onSubmit={submit} noValidate className="flex flex-1 flex-col overflow-hidden">
          <Drawer.Header>
            <Drawer.Title asChild>
              <Heading>Cancel the order</Heading>
            </Drawer.Title>
            <Drawer.Description className="sr-only">
              Confirm the cancellation and add an optional note for the customer.
            </Drawer.Description>
          </Drawer.Header>
          <Drawer.Body className="flex flex-1 flex-col gap-y-2 overflow-auto">
            <Text size="small" className="text-ui-fg-subtle">
              The customer gets an email. Add a note when you want to tell them why.
            </Text>
            <Label htmlFor="cancel-order-note" size="small" weight="plus">
              Note for the customer (optional)
            </Label>
            <Textarea
              id="cancel-order-note"
              rows={6}
              value={note}
              aria-invalid={Boolean(error)}
              onChange={(event) => onChange(event.target.value)}
            />
            <div className="flex items-start justify-between gap-x-4">
              <div>{error && <Hint variant="error">{error}</Hint>}</div>
              <Text size="xsmall" className="text-ui-fg-muted shrink-0">
                {note.length} / {NOTE_LIMIT}
              </Text>
            </div>
          </Drawer.Body>
          <Drawer.Footer>
            <Drawer.Close asChild>
              <Button type="button" size="small" variant="secondary" disabled={busy}>
                Keep the order
              </Button>
            </Drawer.Close>
            <Button type="submit" size="small" variant="danger" isLoading={busy} disabled={busy}>
              Cancel the order
            </Button>
          </Drawer.Footer>
        </form>
      </Drawer.Content>
    </Drawer>
  )
}
