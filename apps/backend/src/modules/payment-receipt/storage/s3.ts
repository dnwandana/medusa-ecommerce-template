import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3"
import type { ReceiptMimeType } from "../constants"
import type { ReceiptStorage, ReceiptStorageOptions } from "./types"

type S3Options = Extract<ReceiptStorageOptions, { type: "s3" }>

const MISSING_ERRORS = new Set(["NoSuchKey", "NotFound"])

// Keeps the receipts in a private bucket of the S3 store. No command sets an ACL, because the
// bucket is private and some S3 stores do not support ACLs.
export class S3ReceiptStorage implements ReceiptStorage {
  private readonly bucket: string
  private readonly client: S3Client

  constructor(options: S3Options, client?: S3Client) {
    this.bucket = options.bucket
    // The client options come from s3ClientOptions() in src/config/s3.ts, so that the receipts and
    // the File Module talk to the S3 store in the same way.
    this.client =
      client ??
      new S3Client({
        endpoint: options.endpoint,
        region: options.region,
        credentials: {
          accessKeyId: options.accessKeyId,
          secretAccessKey: options.secretAccessKey,
        },
        ...options.clientOptions,
      })
  }

  async put(key: string, bytes: Buffer, type: ReceiptMimeType): Promise<void> {
    await this.client.send(
      new PutObjectCommand({ Bucket: this.bucket, Key: key, Body: bytes, ContentType: type })
    )
  }

  async get(key: string): Promise<Buffer | null> {
    try {
      const result = await this.client.send(new GetObjectCommand({ Bucket: this.bucket, Key: key }))
      if (!result.Body) {
        return null
      }
      return Buffer.from(await result.Body.transformToByteArray())
    } catch (error) {
      if (MISSING_ERRORS.has((error as Error)?.name)) {
        return null
      }
      throw error
    }
  }

  async remove(key: string): Promise<void> {
    await this.client.send(new DeleteObjectCommand({ Bucket: this.bucket, Key: key }))
  }
}
