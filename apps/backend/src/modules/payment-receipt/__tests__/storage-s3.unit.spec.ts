import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3"
import { createReceiptStorage } from "../storage"
import { LocalReceiptStorage } from "../storage/local"
import { S3ReceiptStorage } from "../storage/s3"

// The real commands stay, so that the tests can check the command type and its input.
jest.mock("@aws-sdk/client-s3", () => {
  const actual = jest.requireActual("@aws-sdk/client-s3")
  return { ...actual, S3Client: jest.fn() }
})

const clientOptions = {
  forcePathStyle: true,
  requestChecksumCalculation: "WHEN_REQUIRED" as const,
  responseChecksumValidation: "WHEN_REQUIRED" as const,
}
const options = {
  type: "s3" as const,
  bucket: "store-receipts",
  endpoint: "http://garage:3900",
  region: "garage",
  accessKeyId: "k",
  secretAccessKey: "s",
  clientOptions,
}
const send = jest.fn()
const storage = new S3ReceiptStorage(options, { send } as unknown as S3Client)

beforeEach(() => send.mockReset())

it("puts the file with its type and no ACL", async () => {
  await storage.put("order_1/prcpt_1.png", Buffer.from("png"), "image/png")
  const command = send.mock.calls[0][0]
  expect(command).toBeInstanceOf(PutObjectCommand)
  expect(command.input).toEqual({
    Bucket: "store-receipts",
    Key: "order_1/prcpt_1.png",
    Body: Buffer.from("png"),
    ContentType: "image/png",
  })
})

it("reads the bytes of a file", async () => {
  send.mockResolvedValue({ Body: { transformToByteArray: async () => new Uint8Array([1, 2]) } })
  expect(await storage.get("order_1/prcpt_1.png")).toEqual(Buffer.from([1, 2]))
})

it("gives null for a missing file", async () => {
  send.mockRejectedValue(Object.assign(new Error("NoSuchKey"), { name: "NoSuchKey" }))
  expect(await storage.get("order_1/none.png")).toBeNull()
})

it("throws the other read errors", async () => {
  send.mockRejectedValue(Object.assign(new Error("AccessDenied"), { name: "AccessDenied" }))
  await expect(storage.get("order_1/prcpt_1.png")).rejects.toThrow("AccessDenied")
})

it("deletes a file", async () => {
  await storage.remove("order_1/prcpt_1.png")
  expect(send.mock.calls[0][0]).toBeInstanceOf(DeleteObjectCommand)
})

it("makes the storage that the options name", () => {
  expect(createReceiptStorage({ type: "local", dir: "uploads/receipts" })).toBeInstanceOf(
    LocalReceiptStorage
  )
  expect(createReceiptStorage(options)).toBeInstanceOf(S3ReceiptStorage)
})

it("builds the client from the shared options, with no endpoint for AWS", () => {
  new S3ReceiptStorage({
    type: "s3",
    bucket: "receipts",
    region: "eu-west-1",
    accessKeyId: "id",
    secretAccessKey: "secret",
    clientOptions: {
      forcePathStyle: false,
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    },
  })
  expect(S3Client).toHaveBeenCalledWith(
    expect.objectContaining({ endpoint: undefined, region: "eu-west-1", forcePathStyle: false })
  )
})
