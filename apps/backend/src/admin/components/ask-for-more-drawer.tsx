import { Button, Drawer, Heading, Hint, Label, Text, Textarea } from "@medusajs/ui"
import { FormEvent, useState } from "react"
import { validateNote } from "../lib/payment-receipts"

// validateNote in lib/payment-receipts.ts uses the same limit.
const NOTE_LIMIT = 500

type AskForMoreDrawerProps = {
  open: boolean
  onOpenChange(open: boolean): void
  onSubmit(note: string): Promise<void>
  busy: boolean
}

// Takes the note for the customer when the receipts do not show the full amount.
export const AskForMoreDrawer = ({ open, onOpenChange, onSubmit, busy }: AskForMoreDrawerProps) => {
  const [note, setNote] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [tried, setTried] = useState(false)

  const onChange = (value: string) => {
    setNote(value)
    // After the first send, the error follows the text, so the owner sees when it is correct.
    if (tried) {
      setError(validateNote(value))
    }
  }

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    setTried(true)
    const problem = validateNote(note)
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
              <Heading>Ask for more payment</Heading>
            </Drawer.Title>
            <Drawer.Description className="sr-only">
              Write a note that tells the customer what is missing.
            </Drawer.Description>
          </Drawer.Header>
          <Drawer.Body className="flex flex-1 flex-col gap-y-2 overflow-auto">
            <Label htmlFor="ask-for-more-note" size="small" weight="plus">
              Note for the customer
            </Label>
            <Hint id="ask-for-more-hint">
              The customer gets this note by email and on the order page.
            </Hint>
            <Textarea
              id="ask-for-more-note"
              rows={6}
              value={note}
              aria-invalid={Boolean(error)}
              aria-describedby="ask-for-more-hint"
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
                Cancel
              </Button>
            </Drawer.Close>
            <Button type="submit" size="small" isLoading={busy} disabled={busy}>
              Send note
            </Button>
          </Drawer.Footer>
        </form>
      </Drawer.Content>
    </Drawer>
  )
}
