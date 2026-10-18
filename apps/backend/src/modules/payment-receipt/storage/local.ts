import { mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { dirname, resolve, sep } from "node:path"
import type { ReceiptMimeType } from "../constants"
import type { ReceiptStorage } from "./types"

const isMissing = (error: unknown): boolean => (error as NodeJS.ErrnoException)?.code === "ENOENT"

// Keeps the receipts in a private directory. Use it only when no S3 bucket is configured.
export class LocalReceiptStorage implements ReceiptStorage {
  private readonly root: string

  constructor(dir: string) {
    this.root = resolve(process.cwd(), dir)
  }

  // Returns the full path of a key, and refuses a key that leaves the directory.
  private pathOf(key: string): string {
    const path = resolve(this.root, key)
    if (!path.startsWith(this.root + sep)) {
      throw new Error("The receipt key is not valid.")
    }
    return path
  }

  async put(key: string, bytes: Buffer, _type: ReceiptMimeType): Promise<void> {
    const path = this.pathOf(key)
    await mkdir(dirname(path), { recursive: true })
    await writeFile(path, bytes)
  }

  async get(key: string): Promise<Buffer | null> {
    const path = this.pathOf(key)
    try {
      return await readFile(path)
    } catch (error) {
      if (isMissing(error)) {
        return null
      }
      throw error
    }
  }

  async remove(key: string): Promise<void> {
    await rm(this.pathOf(key), { force: true })
  }
}
