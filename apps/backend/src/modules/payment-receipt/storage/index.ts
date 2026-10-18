import { LocalReceiptStorage } from "./local"
import { S3ReceiptStorage } from "./s3"
import type { ReceiptStorage, ReceiptStorageOptions } from "./types"

export type { ReceiptStorage, ReceiptStorageOptions } from "./types"

// Returns the storage that the module options name.
export function createReceiptStorage(options: ReceiptStorageOptions): ReceiptStorage {
  return options.type === "s3"
    ? new S3ReceiptStorage(options)
    : new LocalReceiptStorage(options.dir)
}
