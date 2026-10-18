import type { Ref } from "vue"
import { errorStatus } from "~/utils/errorStatus"
import {
  clearMagicLink,
  readMagicLink,
  saveMagicLink,
  type StoredMagicLink,
} from "~/utils/magicLinkStorage"
import { safeRedirectPath } from "~/utils/safeRedirect"
import { listenForSignIn } from "~/utils/signInChannel"

export const MAGIC_LINK_POLL_MS = 3000
export const MAGIC_LINK_LIFETIME_MS = 15 * 60 * 1000
// The backend sends at most one link for each email in 60 seconds.
const RESEND_WAIT_MS = 60_000

export type MagicLinkPhase = "form" | "sending" | "waiting" | "expired"
export type MagicLinkError = "invalid" | "failed" | "rate_limited" | null

type LinkStatus = "pending" | "confirmed" | "used" | "expired" | "invalid"

// Returns the page after the sign-in. The caller passes the path through useLocalePath().
// A new customer goes to the welcome page first, which then opens the redirect.
export function afterSignInPath(needsWelcome: boolean, redirect: string | null): string {
  const safe = redirect === null ? null : safeRedirectPath(redirect, "") || null
  if (needsWelcome) {
    return safe ? `/account/welcome?redirect=${encodeURIComponent(safe)}` : "/account/welcome"
  }
  return safe ?? "/account"
}

// Returns the state and the functions of the magic link sign-in: the request, the poll of the
// original tab, and the helpers of the verify page.
// The secret goes only to the status route and the session route.
export function useMagicLink(options: { onSignedIn: (path: string) => void }): {
  phase: Ref<MagicLinkPhase>
  email: Ref<string>
  error: Ref<MagicLinkError>
  resendAt: Ref<number | null>
  sentAgain: Ref<boolean>
  requestLink(email: string, redirect: string | null): Promise<void>
  resend(): Promise<void>
  useDifferentEmail(): void
  resume(): boolean
  stop(): void
  checkLink(id: string, token: string): Promise<{ browser: string; requested_at: string } | null>
  confirmLink(id: string, token: string): Promise<boolean>
  sessionFromLink(id: string, token: string): Promise<string | null>
} {
  // The Nuxt context is not available after an await. Get all composables here.
  const sdk = useMedusa()
  const { customer, refresh, signInWithToken, needsWelcome } = useCustomer()

  const phase = ref<MagicLinkPhase>("form")
  const email = ref("")
  const error = ref<MagicLinkError>(null)
  const resendAt = ref<number | null>(null)
  const sentAgain = ref(false)

  // Local variables, not states, so two pages never share one poll. The record stays in memory
  // also when the browser blocks localStorage.
  let record: StoredMagicLink | null = null
  let pollTimer: ReturnType<typeof setTimeout> | undefined
  let closeChannel: (() => void) | undefined
  // The poll, the channel and the verify tab can all see the sign-in. It finishes one time only.
  let finished = false
  let finishing = false

  function stop(): void {
    clearTimeout(pollTimer)
    pollTimer = undefined
    closeChannel?.()
    closeChannel = undefined
  }

  function expire(): void {
    stop()
    phase.value = "expired"
  }

  function complete(redirect: string | null): void {
    finished = true
    stop()
    clearMagicLink()
    record = null
    options.onSignedIn(afterSignInPath(needsWelcome.value, redirect))
  }

  // Finishes the sign-in that the verify tab made. The session cookie is shared by the tabs.
  // Returns false when this browser has no session.
  async function finishFromSession(current: StoredMagicLink): Promise<boolean> {
    try {
      await refresh()
    } catch {
      return false
    }
    if (!customer.value) {
      return false
    }
    complete(current.redirect)
    return true
  }

  async function onChannelSignIn(current: StoredMagicLink): Promise<void> {
    if (finished || finishing) {
      return
    }
    finishing = true
    try {
      await finishFromSession(current)
    } finally {
      finishing = false
    }
  }

  function schedulePoll(): void {
    clearTimeout(pollTimer)
    pollTimer = setTimeout(() => void poll(), MAGIC_LINK_POLL_MS)
  }

  async function poll(): Promise<void> {
    const current = record
    if (!current || finished) {
      return
    }
    if (Date.now() >= current.sent_at + MAGIC_LINK_LIFETIME_MS) {
      expire()
      return
    }

    let status: LinkStatus
    try {
      const answer = await sdk.client.fetch<{ status: LinkStatus }>("/store/magic-link/status", {
        method: "POST",
        body: { id: current.request_id, secret: current.secret },
      })
      status = answer.status
    } catch {
      // A network error is not an answer. The next tick tries again.
      schedulePoll()
      return
    }
    // A new request or a stop during the request makes this answer old.
    if (record !== current || finished || pollTimer === undefined) {
      return
    }

    if (status === "pending") {
      schedulePoll()
      return
    }
    if (status === "expired" || status === "invalid") {
      expire()
      return
    }
    if (finishing) {
      schedulePoll()
      return
    }

    finishing = true
    try {
      if (status === "confirmed") {
        const { token } = await sdk.client.fetch<{ token: string }>("/store/magic-link/session", {
          method: "POST",
          body: { id: current.request_id, secret: current.secret },
        })
        await signInWithToken(token)
        complete(current.redirect)
      } else if (!(await finishFromSession(current))) {
        // The link was used, but not for this browser.
        expire()
      }
    } catch {
      // The next status tells if the link is still open.
      if (!finished) {
        schedulePoll()
      }
    } finally {
      finishing = false
    }
  }

  function start(next: StoredMagicLink): void {
    stop()
    record = next
    finished = false
    email.value = next.email
    resendAt.value = next.sent_at + RESEND_WAIT_MS
    phase.value = "waiting"
    closeChannel = listenForSignIn(next.request_id, () => void onChannelSignIn(next))
    schedulePoll()
  }

  // Returns true when the backend sent the link.
  async function send(address: string, redirect: string | null): Promise<boolean> {
    const value = address.trim().toLowerCase()
    if (!value.includes("@")) {
      error.value = "invalid"
      return false
    }
    error.value = null

    let answer: { request_id: string; secret: string }
    try {
      answer = await sdk.client.fetch<{ request_id: string; secret: string; expires_at: string }>(
        "/store/magic-link",
        { method: "POST", body: { email: value } }
      )
    } catch (failure) {
      error.value = errorStatus(failure) === 429 ? "rate_limited" : "failed"
      return false
    }

    const next: StoredMagicLink = {
      request_id: answer.request_id,
      secret: answer.secret,
      email: value,
      redirect,
      sent_at: Date.now(),
    }
    // A blocked localStorage still shows "Check your email". The link then opens the
    // other-device path of the verify page.
    saveMagicLink(next)
    start(next)
    return true
  }

  async function requestLink(address: string, redirect: string | null): Promise<void> {
    sentAgain.value = false
    phase.value = "sending"
    if (!(await send(address, redirect))) {
      phase.value = "form"
    }
  }

  async function resend(): Promise<void> {
    const current = record ?? readMagicLink()
    if (!current) {
      return
    }
    // A failed resend keeps the wait for the first link. The note of an older resend goes, so
    // the page does not show a success and an error together.
    sentAgain.value = false
    if (await send(current.email, current.redirect)) {
      sentAgain.value = true
    }
  }

  function useDifferentEmail(): void {
    stop()
    clearMagicLink()
    record = null
    error.value = null
    resendAt.value = null
    sentAgain.value = false
    phase.value = "form"
  }

  function resume(): boolean {
    const stored = readMagicLink()
    if (!stored) {
      return false
    }
    if (Date.now() - stored.sent_at >= MAGIC_LINK_LIFETIME_MS) {
      clearMagicLink()
      return false
    }
    start(stored)
    return true
  }

  async function checkLink(
    id: string,
    token: string
  ): Promise<{ browser: string; requested_at: string } | null> {
    try {
      return await sdk.client.fetch<{ browser: string; requested_at: string }>(
        "/store/magic-link/verify",
        { method: "POST", body: { id, token } }
      )
    } catch (failure) {
      // A 400 means that the link is used, expired or not valid.
      if (errorStatus(failure) === 400) {
        return null
      }
      throw failure
    }
  }

  async function confirmLink(id: string, token: string): Promise<boolean> {
    try {
      await sdk.client.fetch("/store/magic-link/confirm", { method: "POST", body: { id, token } })
      return true
    } catch (failure) {
      if (errorStatus(failure) === 400) {
        return false
      }
      throw failure
    }
  }

  // Signs in this browser when it asked for the link. Returns null for a link that another
  // device asked for.
  async function sessionFromLink(id: string, token: string): Promise<string | null> {
    const stored = readMagicLink()
    if (!stored || stored.request_id !== id) {
      return null
    }
    const answer = await sdk.client.fetch<{ token: string }>("/store/magic-link/session", {
      method: "POST",
      body: { id, secret: stored.secret, token },
    })
    await signInWithToken(answer.token)
    finished = true
    stop()
    clearMagicLink()
    return afterSignInPath(needsWelcome.value, stored.redirect)
  }

  if (getCurrentScope()) {
    onScopeDispose(stop)
  }

  return {
    phase,
    email,
    error,
    resendAt,
    sentAgain,
    requestLink,
    resend,
    useDifferentEmail,
    resume,
    stop,
    checkLink,
    confirmLink,
    sessionFromLink,
  }
}
