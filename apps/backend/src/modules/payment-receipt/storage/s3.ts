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

// Keeps the receipts in a private bucket. No command sets an ACL, because the bucket has no web
// endpoint and Garage does not support ACLs.
export class S3ReceiptStorage implements ReceiptStorage {
  private readonly bucket: string
  private readonly client: S3Client

  constructor(options: S3Options, client?: S3Client) {
    this.bucket = options.bucket
    // The same client settings as the File Module in src/config/modules.ts.
    this.client =
      client ??
      new S3Client({
        endpoint: options.endpoint,
        region: options.region,
        credentials: {
          accessKeyId: options.accessKeyId,
          secretAccessKey: options.secretAccessKey,
        },
        forcePathStyle: true,
        requestChecksumCalculation: "WHEN_REQUIRED",
        responseChecksumValidation: "WHEN_REQUIRED",
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
