import type { CampaignStatus } from "./campaign-form"

export const CAMPAIGN_PAGE_SIZE = 20

export type CampaignAction = "edit" | "publish" | "unpublish" | "duplicate" | "delete"

export type CampaignPrompt = { title: string; description: string }

/** Returns the query of GET /admin/home-campaigns. A blank search is left out. */
export function campaignListQuery(
  pageIndex: number,
  status: CampaignStatus | "all",
  q: string
): { limit: number; offset: number; status?: CampaignStatus; q?: string } {
  const query: { limit: number; offset: number; status?: CampaignStatus; q?: string } = {
    limit: CAMPAIGN_PAGE_SIZE,
    offset: pageIndex * CAMPAIGN_PAGE_SIZE,
  }
  if (status !== "all") {
    query.status = status
  }
  const search = q.trim()
  if (search) {
    query.q = search
  }
  return query
}

const STATUS_BADGES: Record<CampaignStatus, { color: "grey" | "green"; label: string }> = {
  draft: { color: "grey", label: "Draft" },
  live: { color: "green", label: "Live" },
  ended: { color: "grey", label: "Ended" },
}

/** Returns the color and the label of the status badge. */
export function campaignStatusBadge(status: CampaignStatus): {
  color: "grey" | "green"
  label: string
} {
  return STATUS_BADGES[status]
}

// The routes delete only a draft, and only the live campaign can be unpublished.
const STATUS_ACTIONS: Record<CampaignStatus, CampaignAction[]> = {
  draft: ["edit", "publish", "duplicate", "delete"],
  live: ["edit", "unpublish", "duplicate"],
  ended: ["edit", "publish", "duplicate"],
}

/** Returns the row actions of a campaign status, in menu order. */
export function campaignActions(status: CampaignStatus): CampaignAction[] {
  return STATUS_ACTIONS[status]
}

// The store is in Indonesia, so the dates use the time zone of Jakarta.
const DATE_FORMAT = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
  timeZone: "Asia/Jakarta",
})

/** Returns a date as "18 Oct 2026", or "-" for no date. */
export function formatCampaignDate(value: string | null): string {
  return value ? DATE_FORMAT.format(new Date(value)) : "-"
}

/** Returns the publish prompt. It names the live campaign that the publish ends. */
export function publishPrompt(liveName: string | null): CampaignPrompt {
  const result = "This home campaign then shows on the home page."
  return {
    title: "Publish this home campaign?",
    description: liveName
      ? `The live home campaign “${liveName}” changes to Ended. ${result}`
      : result,
  }
}

export const UNPUBLISH_PROMPT: CampaignPrompt = {
  title: "Unpublish this home campaign?",
  description:
    "The home campaign changes to Ended. The home page shows the text-only hero until you publish a home campaign.",
}

export const DELETE_PROMPT: CampaignPrompt = {
  title: "Delete this home campaign?",
  description: "The home campaign leaves the list. The history keeps the record.",
}

/**
 * Returns the text of a failed request. The routes give a 400 answer with a message for staff,
 * for example when the category of the link no longer exists. Other errors get the fallback.
 */
export function campaignErrorText(error: unknown, fallback: string): string {
  if (error instanceof Error && "status" in error && error.status === 400 && error.message) {
    return error.message
  }
  return fallback
}
