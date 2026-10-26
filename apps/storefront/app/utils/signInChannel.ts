// The verify tab and the original tab of a magic link sign-in talk on this channel. The messages
// carry no token, no secret and no session.
export const SIGN_IN_CHANNEL = "store-sign-in"

export type SignInMessage =
  { type: "signed-in"; request_id: string } | { type: "ack"; request_id: string }

function openChannel(): BroadcastChannel | null {
  // The server and old browsers have no BroadcastChannel.
  if (typeof BroadcastChannel === "undefined") {
    return null
  }
  return new BroadcastChannel(SIGN_IN_CHANNEL)
}

function isMessage(data: unknown, type: SignInMessage["type"], requestId: string): boolean {
  const message = data as Partial<SignInMessage> | null
  return message?.type === type && message.request_id === requestId
}

// The verify tab calls this after its own sign-in. Resolves true when the original tab answers.
// The verify tab then closes. With no answer, the verify tab stays open as the signed-in tab.
export function announceSignIn(requestId: string, waitMs = 1500): Promise<boolean> {
  const channel = openChannel()
  if (!channel) {
    return Promise.resolve(false)
  }

  return new Promise((resolve) => {
    const finish = (answered: boolean): void => {
      clearTimeout(timer)
      channel.close()
      resolve(answered)
    }
    const timer = setTimeout(() => finish(false), waitMs)
    channel.onmessage = (event: MessageEvent) => {
      if (isMessage(event.data, "ack", requestId)) {
        finish(true)
      }
    }
    const message: SignInMessage = { type: "signed-in", request_id: requestId }
    channel.postMessage(message)
  })
}

// The original tab calls this on "Check your email". It answers first, so the verify tab can
// close, and then calls onSignIn one time. The returned function closes the channel.
export function listenForSignIn(requestId: string, onSignIn: () => void): () => void {
  const channel = openChannel()
  if (!channel) {
    return () => {}
  }

  let called = false
  channel.onmessage = (event: MessageEvent) => {
    if (!isMessage(event.data, "signed-in", requestId)) {
      return
    }
    const ack: SignInMessage = { type: "ack", request_id: requestId }
    channel.postMessage(ack)
    if (!called) {
      called = true
      onSignIn()
    }
  }
  return () => channel.close()
}
