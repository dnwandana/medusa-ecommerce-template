import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { LocalReceiptStorage } from "../storage/local"

let dir: string

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "receipts-"))
})

afterEach(async () => {
  await rm(dir, { recursive: true, force: true })
})

it("writes, reads and removes a file below the directory", async () => {
  const storage = new LocalReceiptStorage(dir)
  await storage.put("order_1/prcpt_1.png", Buffer.from("png"), "image/png")
  expect((await storage.get("order_1/prcpt_1.png"))?.toString()).toBe("png")
  await storage.remove("order_1/prcpt_1.png")
  expect(await storage.get("order_1/prcpt_1.png")).toBeNull()
})

it("gives null for a missing file and does not throw on a second remove", async () => {
  const storage = new LocalReceiptStorage(dir)
  expect(await storage.get("order_1/none.png")).toBeNull()
  await expect(storage.remove("order_1/none.png")).resolves.toBeUndefined()
})

it("refuses a key that leaves the directory", async () => {
  const storage = new LocalReceiptStorage(dir)
  await expect(storage.put("../escape.png", Buffer.from("x"), "image/png")).rejects.toThrow()
  await expect(storage.get("/etc/passwd")).rejects.toThrow()
})
