import { model } from "@medusajs/framework/utils"

// One request for a magic sign-in link. The table keeps only hashes of the token and the
// secret, so a copy of the database cannot sign in.
const MagicLinkRequest = model.define("magic_link_request", {
  id: model.id({ prefix: "mlr" }).primaryKey(),
  // The email in lower case.
  email: model.text().index("IDX_magic_link_request_email"),
  // The SHA-256 hash of the token in the link.
  token_hash: model.text(),
  // The SHA-256 hash of the secret that only the browser of the request holds.
  secret_hash: model.text(),
  // "en-US" or "id-ID", from the request header x-medusa-locale.
  locale: model.text(),
  // For example "Chrome on Windows". The confirm screen shows it.
  browser: model.text(),
  expires_at: model.dateTime(),
  confirmed_at: model.dateTime().nullable(),
  consumed_at: model.dateTime().nullable(),
  invalidated_at: model.dateTime().nullable(),
})

export default MagicLinkRequest
