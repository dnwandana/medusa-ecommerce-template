# Mayar sandbox check

Date of the check: 2026-10-02. Command: `pnpm --filter @store/backend mayar:check`.

| Fact | Result |
| --- | --- |
| A. `redirectUrl` on invoice creation | not verified: no sandbox key |
| B. `extraData.session_id` on invoice creation | not verified: no sandbox key |
| C. `link` is a full URL | not verified: no sandbox key |
| D. Extra data on the invoice detail | not verified: no sandbox key |
| E. Status after the close request | not verified: no sandbox key |
| F. Webhook payload has `data.productId` equal to the invoice id | not verified: no sandbox key (2026-10-02) |
| G. Customer returns to `redirectUrl` after payment | not verified: no sandbox key (2026-10-02) |

## Responses

There are no responses yet, because the check did not run without a sandbox key.
