import type { S3ClientOptions } from "../../../config/s3"
import type { ReceiptMimeType } from "../constants"

export interface ReceiptStorage {
  put(key: string, bytes: Buffer, type: ReceiptMimeType): Promise<void>
  get(key: string): Promise<Buffer | null>
  remove(key: string): Promise<void>
}

export type ReceiptStorageOptions =
  | { type: "local"; dir: string }
  | {
      type: "s3"
      bucket: string
      endpoint?: string
      region: string
      accessKeyId: string
      secretAccessKey: string
      clientOptions: S3ClientOptions
    }
