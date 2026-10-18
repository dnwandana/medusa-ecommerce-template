import { MedusaError, MedusaService } from "@medusajs/framework/utils"
import MagicLinkRequest from "./models/magic-link-request"
import {
  createRandomToken,
  hashToken,
  MAGIC_LINK_CONFIRM_WINDOW_MS,
  MAGIC_LINK_LIFETIME_MS,
  MAGIC_LINK_RESEND_MS,
  tokenMatches,
} from "./tokens"

export type MagicLinkRequestInput = { email: string; locale: string; browser: string }

export type CreatedMagicLinkRequest = {
  request_id: string
  token: string
  secret: string
  expires_at: Date
  created_at: Date
}

export type MagicLinkDetails = { browser: string; requested_at: Date; locale: string }

export type MagicLinkStatus = "pending" | "confirmed" | "used" | "expired" | "invalid"

type StoredRequest = {
  id: string
  email: string
  token_hash: string
  secret_hash: string
  locale: string
  browser: string
  created_at: Date | string
  expires_at: Date | string
  confirmed_at: Date | string | null
  consumed_at: Date | string | null
  invalidated_at: Date | string | null
}

// Returns the request, or null for an unknown id. The helpers are functions and not private
// methods, because the unit tests call the methods with a mocked service.
async function findRequest(service: any, id: string): Promise<StoredRequest | null> {
  try {
    return (await service.retrieveMagicLinkRequest(id)) as StoredRequest
  } catch (error) {
    if (error instanceof MedusaError && error.type === MedusaError.Types.NOT_FOUND) {
      return null
    }
    throw error
  }
}

const time = (value: Date | string): number => new Date(value).getTime()

// A link is open when the token matches and nobody confirmed, used or replaced the link before
// it expired.
function isOpen(request: StoredRequest, token: string, now: Date): boolean {
  return (
    tokenMatches(token, request.token_hash) &&
    !request.confirmed_at &&
    !request.consumed_at &&
    !request.invalidated_at &&
    now.getTime() < time(request.expires_at)
  )
}

// The original tab can take the session for a short time after the other device confirmed.
function inConfirmWindow(request: StoredRequest, now: Date): boolean {
  return (
    !!request.confirmed_at &&
    now.getTime() < time(request.confirmed_at) + MAGIC_LINK_CONFIRM_WINDOW_MS
  )
}

class MagicLinkModuleService extends MedusaService({ MagicLinkRequest }) {
  // Creates a sign-in link for the email. Returns null when the email got a link less than 60
  // seconds ago. The caller then sends no email. The rule does not read the customers, so a known
  // and an unknown email get the same result. The older links stay valid until the caller sent
  // the email and called invalidateOlderLinks. The caller must hold a lock for the email, because
  // the check and the insert are two queries.
  async createRequest(
    input: MagicLinkRequestInput,
    now: Date = new Date()
  ): Promise<CreatedMagicLinkRequest | null> {
    const email = input.email.trim().toLowerCase()

    const [newest] = await this.listMagicLinkRequests(
      { email },
      { order: { created_at: "DESC" }, take: 1 }
    )
    if (
      newest &&
      !newest.invalidated_at &&
      now.getTime() - new Date(newest.created_at).getTime() < MAGIC_LINK_RESEND_MS
    ) {
      return null
    }

    // Only the hashes go into the database. The plain values go to the email and the browser.
    const token = createRandomToken()
    const secret = createRandomToken()
    const expiresAt = new Date(now.getTime() + MAGIC_LINK_LIFETIME_MS)
    const created = await this.createMagicLinkRequests({
      email,
      token_hash: hashToken(token),
      secret_hash: hashToken(secret),
      locale: input.locale,
      browser: input.browser,
      expires_at: expiresAt,
    })

    return {
      request_id: created.id,
      token,
      secret,
      expires_at: expiresAt,
      created_at: new Date(created.created_at),
    }
  }

  // Makes the open links of the email that are older than the new link invalid. The caller
  // calls it after the email of the new link is sent, so a failed email keeps the older link.
  async invalidateOlderLinks(
    email: string,
    newest: Pick<CreatedMagicLinkRequest, "request_id" | "created_at">,
    now: Date = new Date()
  ): Promise<void> {
    const open = await this.listMagicLinkRequests({
      email: email.trim().toLowerCase(),
      consumed_at: null,
      invalidated_at: null,
      created_at: { $lt: newest.created_at },
    })
    const older = open.filter((request) => request.id !== newest.request_id)
    if (older.length > 0) {
      await this.updateMagicLinkRequests(
        older.map((request) => ({ id: request.id, invalidated_at: now }))
      )
    }
  }

  // Returns the details of an open link for the confirm screen. It changes nothing, so a mail
  // scanner that opens the link uses up nothing.
  async verifyLink(
    id: string,
    token: string,
    now: Date = new Date()
  ): Promise<MagicLinkDetails | null> {
    const request = await findRequest(this, id)
    if (!request || !isOpen(request, token, now)) return null
    return {
      browser: request.browser,
      requested_at: new Date(request.created_at),
      locale: request.locale,
    }
  }

  // Marks an open link as confirmed ("Yes, sign me in" on the other device). Returns false for a
  // link that is not open. The caller must hold the lock of the request.
  async confirmLink(id: string, token: string, now: Date = new Date()): Promise<boolean> {
    const request = await findRequest(this, id)
    if (!request || !isOpen(request, token, now)) return false
    await this.updateMagicLinkRequests({ id: request.id, confirmed_at: now })
    return true
  }

  // Returns the status of the link for the original tab. Only the browser of the request has
  // the secret.
  async linkStatus(id: string, secret: string, now: Date = new Date()): Promise<MagicLinkStatus> {
    const request = await findRequest(this, id)
    if (!request || !tokenMatches(secret, request.secret_hash)) return "invalid"
    if (request.consumed_at) return "used"
    if (request.invalidated_at) return "expired"
    if (request.confirmed_at) return inConfirmWindow(request, now) ? "confirmed" : "expired"
    return now.getTime() < time(request.expires_at) ? "pending" : "expired"
  }

  // Uses up the link and returns the email for the session. The secret is always necessary, so
  // a scanner or another device never gets a session. With the token, the link must be open
  // (the same browser). Without the token, the other device must have confirmed the link. The
  // caller must hold the lock of the request, so two calls never both use the link.
  async consumeLink(
    input: { id: string; secret: string; token?: string },
    now: Date = new Date()
  ): Promise<{ email: string } | null> {
    const request = await findRequest(this, input.id)
    if (!request || !tokenMatches(input.secret, request.secret_hash)) return null
    if (request.consumed_at || request.invalidated_at) return null

    const allowed =
      input.token !== undefined ? isOpen(request, input.token, now) : inConfirmWindow(request, now)
    if (!allowed) return null

    await this.updateMagicLinkRequests({
      id: request.id,
      consumed_at: now,
      ...(request.confirmed_at ? {} : { confirmed_at: now }),
    })
    return { email: request.email }
  }
}

export default MagicLinkModuleService
