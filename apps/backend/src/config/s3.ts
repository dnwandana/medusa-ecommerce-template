import type { Env } from "./modules"

export type S3ClientOptions = {
  forcePathStyle: boolean
  requestChecksumCalculation: "WHEN_REQUIRED"
  responseChecksumValidation: "WHEN_REQUIRED"
}

// Returns the S3 client options that the File Module and the receipt storage share, so that the
// two clients talk to the S3 store in the same way. A bad S3_FORCE_PATH_STYLE stops the start,
// because the wrong URL style makes each upload fail later.
export function s3ClientOptions(env: Env): S3ClientOptions {
  const value = env.S3_FORCE_PATH_STYLE
  if (value !== undefined && value !== "" && value !== "true" && value !== "false") {
    throw new Error(`S3_FORCE_PATH_STYLE must be true or false. Value: ${value}`)
  }

  return {
    // Many S3 stores, for example Garage and MinIO, need path-style URLs. AWS S3 with
    // virtual-hosted URLs needs false.
    forcePathStyle: value !== "false",
    // The AWS SDK adds checksums by default, and some S3 stores refuse them. Garage issue 1236 is
    // an example. With WHEN_REQUIRED, the SDK adds a checksum only when the operation needs one.
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  }
}
