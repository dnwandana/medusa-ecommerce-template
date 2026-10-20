import { defineWidgetConfig } from "@medusajs/admin-sdk"
import type { DetailWidgetProps, HttpTypes } from "@medusajs/framework/types"
import { Spinner } from "@medusajs/icons"
import { Button, Container, Heading, InlineTip, Text, toast, usePrompt } from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useState } from "react"
import { AskForMoreDrawer } from "../components/ask-for-more-drawer"
import { CancelOrderDrawer } from "../components/cancel-order-drawer"
import {
  isBankTransferOrder,
  receiptColumnClass,
  receiptCountLabel,
  receiptFileUrl,
  type WidgetOrder,
  widgetActions,
} from "../lib/payment-receipts"
import { sdk } from "../lib/sdk"

type Receipt = { id: string; file_name: string; mime_type: string; created_at: string }
type Note = { id: string; note: string; created_at: string }
type ReceiptsResponse = { receipts: Receipt[]; note: Note | null }

const formatTime = (value: string): string =>
  new Date(value).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" })

const errorText = (error: unknown): string =>
  error instanceof Error && error.message ? error.message : "The request failed. Try again."

// Shows the receipts of a bank transfer order and the owner actions: accept the payment, ask for
// more payment, or cancel the order. The images come from the Admin file route with the session
// cookie, because the receipts are private.
const PaymentReceiptsWidget = ({ data: order }: DetailWidgetProps<HttpTypes.AdminOrder>) => {
  const queryClient = useQueryClient()
  const prompt = usePrompt()
  const [askDrawerOpen, setAskDrawerOpen] = useState(false)
  const [cancelDrawerOpen, setCancelDrawerOpen] = useState(false)
  const widgetOrder = order as unknown as WidgetOrder
  const isBankTransfer = isBankTransferOrder(widgetOrder)
  const receiptsKey = ["payment-receipts", order.id]

  const { data, isLoading } = useQuery({
    queryKey: receiptsKey,
    queryFn: () => sdk.client.fetch<ReceiptsResponse>(`/admin/orders/${order.id}/receipts`),
    // A gateway order has no receipts, so the widget does not ask for them.
    enabled: isBankTransfer,
  })

  // The order keys of the Admin refresh the built-in payment section and the order status.
  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: receiptsKey }),
      queryClient.invalidateQueries({ queryKey: ["orders"] }),
    ])

  const accept = useMutation({
    mutationFn: () =>
      sdk.client.fetch<{ captured: boolean }>(`/admin/orders/${order.id}/receipts/accept`, {
        method: "POST",
      }),
    onSuccess: async () => {
      await refresh()
      toast.success("The payment is captured.")
    },
    onError: (error) => toast.error(errorText(error)),
  })

  const askForMore = useMutation({
    mutationFn: (note: string) =>
      sdk.client.fetch<{ note: Note }>(`/admin/orders/${order.id}/receipts/ask-for-more`, {
        method: "POST",
        body: { note },
      }),
    onSuccess: async () => {
      await refresh()
      setAskDrawerOpen(false)
      toast.success("The note is sent to the customer.")
    },
    onError: (error) => toast.error(errorText(error)),
  })

  // The native cancel route has no note, so the widget uses the custom route. The custom route
  // writes the note into the order metadata for the cancellation email.
  const cancel = useMutation({
    mutationFn: (note: string) =>
      sdk.client.fetch<{ cancelled: boolean }>(`/admin/orders/${order.id}/receipts/cancel`, {
        method: "POST",
        body: note ? { note } : {},
      }),
    onSuccess: async () => {
      await refresh()
      setCancelDrawerOpen(false)
      toast.success("The order is cancelled.")
    },
    onError: (error) => toast.error(errorText(error)),
  })

  if (!isBankTransfer) {
    return null
  }

  const busy = accept.isPending || askForMore.isPending || cancel.isPending
  const actions = widgetActions(widgetOrder)
  const receipts = data?.receipts ?? []
  const note = data?.note ?? null

  const onAccept = async () => {
    const confirmed = await prompt({
      title: "Accept payment",
      description: `Accept the payment? Medusa captures the full amount of order #${order.display_id}.`,
      confirmText: "Accept payment",
      cancelText: "Cancel",
    })
    if (confirmed) {
      accept.mutate()
    }
  }

  // The drawers keep the typed note when the request fails, so the error must reach them.
  const onSendNote = async (text: string) => {
    await askForMore.mutateAsync(text)
  }

  const onConfirmCancel = async (text: string) => {
    await cancel.mutateAsync(text)
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-center justify-between gap-x-4 px-6 py-4">
        <Heading level="h2">Payment receipts</Heading>
        {!isLoading && (
          <Text size="small" className="text-ui-fg-subtle">
            {receiptCountLabel(receipts.length)}
          </Text>
        )}
      </div>
      {isLoading ? (
        <div className="flex justify-center px-6 py-4">
          <Spinner className="text-ui-fg-subtle animate-spin" />
        </div>
      ) : (
        <>
          {note && (
            <div className="px-6 py-4">
              <InlineTip label="Note to the customer" variant="info">
                <span className="whitespace-pre-line">{note.note}</span>
                <span className="text-ui-fg-subtle block">{formatTime(note.created_at)}</span>
              </InlineTip>
            </div>
          )}
          {receipts.length > 0 && (
            <div className="grid grid-cols-12 gap-4 px-6 py-4">
              {receipts.map((receipt) => (
                <div
                  key={receipt.id}
                  className={`${receiptColumnClass(receipts.length)} flex flex-col gap-y-2`}
                >
                  <a
                    href={receiptFileUrl(receipt.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="border-ui-border-base block overflow-hidden rounded-lg border"
                  >
                    <img
                      src={receiptFileUrl(receipt.id)}
                      alt={receipt.file_name}
                      className="h-56 w-full object-cover"
                    />
                  </a>
                  <div>
                    <Text size="small" leading="compact" weight="plus" className="truncate">
                      {receipt.file_name}
                    </Text>
                    <Text size="small" leading="compact" className="text-ui-fg-subtle">
                      {formatTime(receipt.created_at)}
                    </Text>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
      {(actions.accept || actions.askForMore || actions.cancel) && (
        <div className="flex flex-wrap items-center justify-end gap-2 px-6 py-4">
          {actions.cancel && (
            <Button
              size="small"
              variant="danger"
              disabled={busy}
              onClick={() => setCancelDrawerOpen(true)}
            >
              Cancel order
            </Button>
          )}
          {actions.askForMore && (
            <Button
              size="small"
              variant="secondary"
              disabled={busy}
              onClick={() => setAskDrawerOpen(true)}
            >
              Ask for more
            </Button>
          )}
          {actions.accept && (
            <Button size="small" disabled={busy} isLoading={accept.isPending} onClick={onAccept}>
              Accept payment
            </Button>
          )}
        </div>
      )}
      <AskForMoreDrawer
        open={askDrawerOpen}
        onOpenChange={setAskDrawerOpen}
        onSubmit={onSendNote}
        busy={askForMore.isPending}
      />
      <CancelOrderDrawer
        open={cancelDrawerOpen}
        onOpenChange={setCancelDrawerOpen}
        onSubmit={onConfirmCancel}
        busy={cancel.isPending}
      />
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "order.details",
})

export default PaymentReceiptsWidget
