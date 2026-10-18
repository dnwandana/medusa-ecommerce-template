import { MedusaService } from "@medusajs/framework/utils"
import type { ReceiptMimeType } from "./constants"
import PaymentNote from "./models/payment-note"
import PaymentReceipt from "./models/payment-receipt"
import { createReceiptStorage, type ReceiptStorage, type ReceiptStorageOptions } from "./storage"

export type PaymentReceiptModuleOptions = { storage: ReceiptStorageOptions }

// The summary has no file_key. Only the admin file route reads the key.
export type ReceiptSummary = { id: string; file_name: string; mime_type: string; created_at: Date }

export type NoteSummary = { id: string; note: string; created_at: Date }

export type OrderReceiptState = {
  order_id: string
  receipts: ReceiptSummary[]
  note: NoteSummary | null
}

const time = (value: Date | string): number => new Date(value).getTime()

class PaymentReceiptModuleService extends MedusaService({ PaymentReceipt, PaymentNote }) {
  private readonly storage_: ReceiptStorage

  constructor(container: Record<string, unknown>, options: PaymentReceiptModuleOptions) {
    // eslint-disable-next-line prefer-rest-params
    super(...arguments)
    // Module options are plain data, so the module makes the storage here.
    this.storage_ = createReceiptStorage(options.storage)
  }

  // Returns one state for each id, in the input order. It makes two queries for any number of ids.
  async receiptStates(orderIds: string[]): Promise<OrderReceiptState[]> {
    if (!orderIds.length) {
      return []
    }
    const [receipts, notes] = await Promise.all([
      this.listPaymentReceipts(
        { order_id: orderIds },
        { select: ["id", "order_id", "file_name", "mime_type", "created_at"] }
      ),
      this.listPaymentNotes(
        { order_id: orderIds },
        { select: ["id", "order_id", "note", "created_at"] }
      ),
    ])
    return orderIds.map((orderId) => {
      const own = receipts
        .filter((receipt) => receipt.order_id === orderId)
        .sort((a, b) => time(a.created_at) - time(b.created_at))
      const newest = notes
        .filter((note) => note.order_id === orderId)
        .sort((a, b) => time(b.created_at) - time(a.created_at))[0]
      return {
        order_id: orderId,
        receipts: own.map(({ id, file_name, mime_type, created_at }) => ({
          id,
          file_name,
          mime_type,
          created_at,
        })),
        note: newest ? { id: newest.id, note: newest.note, created_at: newest.created_at } : null,
      }
    })
  }

  async countReceipts(orderId: string): Promise<number> {
    const receipts = await this.listPaymentReceipts({ order_id: orderId }, { select: ["id"] })
    return receipts.length
  }

  async putFile(key: string, bytes: Buffer, type: ReceiptMimeType): Promise<void> {
    await this.storage_.put(key, bytes, type)
  }

  async getFile(key: string): Promise<Buffer | null> {
    return this.storage_.get(key)
  }

  async removeFile(key: string): Promise<void> {
    await this.storage_.remove(key)
  }
}

export default PaymentReceiptModuleService
