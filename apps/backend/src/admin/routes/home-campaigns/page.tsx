import { defineRouteConfig } from "@medusajs/admin-sdk"
import { Photo, Spinner } from "@medusajs/icons"
import {
  Button,
  Container,
  createDataTableColumnHelper,
  DataTable,
  DataTablePaginationState,
  Heading,
  Select,
  StatusBadge,
  Text,
  Toaster,
  toast,
  useDataTable,
  usePrompt,
} from "@medusajs/ui"
import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { CreateCampaignModal } from "../../components/create-campaign-modal"
import { AdminHomeCampaign, CampaignStatus } from "../../lib/campaign-form"
import {
  CAMPAIGN_PAGE_SIZE,
  CampaignAction,
  campaignActions,
  campaignErrorText,
  campaignListQuery,
  campaignStatusBadge,
  DELETE_PROMPT,
  formatCampaignDate,
  publishPrompt,
  UNPUBLISH_PROMPT,
} from "../../lib/campaign-list"
import { sdk } from "../../lib/sdk"

type CampaignList = {
  home_campaigns: AdminHomeCampaign[]
  count: number
  limit: number
  offset: number
}

// The list, the live campaign and the detail pages all have keys that start with this key, so one
// invalidation reloads all of them.
const CAMPAIGNS_KEY = ["home-campaigns"]

const LIVE_QUERY = { status: "live", limit: 1 }

const ACTION_LABELS: Record<CampaignAction, string> = {
  edit: "Edit",
  publish: "Publish",
  unpublish: "Unpublish",
  duplicate: "Duplicate",
  delete: "Delete",
}

// The request, the success text and the error text of each action that changes a campaign.
const ACTION_REQUESTS: Record<
  Exclude<CampaignAction, "edit">,
  { path: (id: string) => string; method: "POST" | "DELETE"; success: string; failure: string }
> = {
  publish: {
    path: (id) => `/admin/home-campaigns/${id}/publish`,
    method: "POST",
    success: "The home campaign is live.",
    failure: "The home campaign was not published. Try again.",
  },
  unpublish: {
    path: (id) => `/admin/home-campaigns/${id}/unpublish`,
    method: "POST",
    success: "The home campaign changed to Ended.",
    failure: "The home campaign was not unpublished. Try again.",
  },
  duplicate: {
    path: (id) => `/admin/home-campaigns/${id}/duplicate`,
    method: "POST",
    success: "The copy is saved as a draft.",
    failure: "The home campaign was not duplicated. Try again.",
  },
  delete: {
    path: (id) => `/admin/home-campaigns/${id}`,
    method: "DELETE",
    success: "The home campaign is deleted.",
    failure: "The home campaign was not deleted. Try again.",
  },
}

const STATUS_OPTIONS: { value: CampaignStatus | "all"; label: string }[] = [
  { value: "all", label: "All" },
  { value: "draft", label: "Draft" },
  { value: "live", label: "Live" },
  { value: "ended", label: "Ended" },
]

const columnHelper = createDataTableColumnHelper<AdminHomeCampaign>()

const HomeCampaignsPage = () => {
  const navigate = useNavigate()
  const prompt = usePrompt()
  const queryClient = useQueryClient()
  const [pagination, setPagination] = useState<DataTablePaginationState>({
    pageSize: CAMPAIGN_PAGE_SIZE,
    pageIndex: 0,
  })
  const [status, setStatus] = useState<CampaignStatus | "all">("all")
  const [search, setSearch] = useState("")
  const [creating, setCreating] = useState(false)

  const query = useMemo(
    () => campaignListQuery(pagination.pageIndex, status, search),
    [pagination.pageIndex, status, search]
  )

  // The previous page stays on the screen while the next page loads. Thus the spinner shows only
  // for the first page, and the search field keeps the focus.
  const { data, isLoading } = useQuery<CampaignList>({
    queryKey: [...CAMPAIGNS_KEY, query],
    queryFn: () => sdk.client.fetch("/admin/home-campaigns", { query }),
    placeholderData: keepPreviousData,
  })

  // The publish prompt names the live campaign that the publish ends.
  const { data: liveData } = useQuery<CampaignList>({
    queryKey: [...CAMPAIGNS_KEY, "live"],
    queryFn: () => sdk.client.fetch("/admin/home-campaigns", { query: LIVE_QUERY }),
  })
  const liveName = liveData?.home_campaigns[0]?.name ?? null

  const runAction = useMutation({
    mutationFn: ({ action, id }: { action: Exclude<CampaignAction, "edit">; id: string }) =>
      sdk.client.fetch(ACTION_REQUESTS[action].path(id), {
        method: ACTION_REQUESTS[action].method,
      }),
    onSuccess: async (_result, { action }) => {
      toast.success(ACTION_REQUESTS[action].success)
      await queryClient.invalidateQueries({ queryKey: CAMPAIGNS_KEY })
    },
    onError: (error, { action }) =>
      toast.error(campaignErrorText(error, ACTION_REQUESTS[action].failure)),
  })

  const onAction = async (action: CampaignAction, campaign: AdminHomeCampaign) => {
    if (action === "edit") {
      navigate(`/home-campaigns/${campaign.id}`)
      return
    }
    if (action !== "duplicate") {
      const texts =
        action === "publish"
          ? publishPrompt(liveName)
          : action === "unpublish"
            ? UNPUBLISH_PROMPT
            : DELETE_PROMPT
      const confirmed = await prompt({
        ...texts,
        variant: action === "publish" ? "confirmation" : "danger",
        confirmText: ACTION_LABELS[action],
        cancelText: "Cancel",
      })
      if (!confirmed) {
        return
      }
    }
    runAction.mutate({ action, id: campaign.id })
  }

  const columns = [
    columnHelper.accessor("name", {
      header: "Name",
      cell: ({ row }) => (
        <span className={row.original.status === "ended" ? "text-ui-fg-muted" : undefined}>
          {row.original.name}
        </span>
      ),
    }),
    columnHelper.accessor("status", {
      header: "Status",
      cell: ({ row }) => {
        const badge = campaignStatusBadge(row.original.status)
        return <StatusBadge color={badge.color}>{badge.label}</StatusBadge>
      },
    }),
    columnHelper.accessor("went_live_at", {
      header: "Went live",
      cell: ({ row }) => formatCampaignDate(row.original.went_live_at),
    }),
    columnHelper.accessor("ended_at", {
      header: "Ended",
      cell: ({ row }) => formatCampaignDate(row.original.ended_at),
    }),
    columnHelper.accessor("updated_at", {
      header: "Updated",
      cell: ({ row }) => formatCampaignDate(row.original.updated_at),
    }),
    columnHelper.action({
      actions: ({ row }) =>
        campaignActions(row.original.status).map((action) => ({
          label: ACTION_LABELS[action],
          onClick: () => onAction(action, row.original),
        })),
    }),
  ]

  const table = useDataTable({
    columns,
    data: data?.home_campaigns ?? [],
    rowCount: data?.count ?? 0,
    isLoading,
    getRowId: (row) => row.id,
    // A click on the menu button of the row bubbles to the row. That click must open only the menu.
    onRowClick: (event, row) => {
      if (!(event.target as HTMLElement).closest("button")) {
        navigate(`/home-campaigns/${row.id}`)
      }
    },
    pagination: { state: pagination, onPaginationChange: setPagination },
    search: {
      state: search,
      onSearchChange: (value) => {
        setSearch(value)
        setPagination({ pageSize: CAMPAIGN_PAGE_SIZE, pageIndex: 0 })
      },
    },
  })

  // The table sees the search, but not the status filter. Thus a status with no row also shows
  // "No results".
  const noResults = {
    heading: "No results",
    description: "No home campaign matches the search or the filter.",
  }
  const emptyState = {
    empty:
      status === "all"
        ? {
            heading: "No home campaigns",
            description:
              "Create a home campaign to show an image and a text in the hero of the home page.",
          }
        : noResults,
    filtered: noResults,
  }

  return (
    <Container className="divide-y p-0">
      <div className="flex items-start justify-between gap-x-4 px-6 py-4">
        <div>
          <Heading>Home campaigns</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            The live home campaign sets the hero of the home page.
          </Text>
        </div>
        <Button type="button" size="small" variant="secondary" onClick={() => setCreating(true)}>
          Create
        </Button>
      </div>
      {isLoading ? (
        <div className="flex justify-center px-6 py-10">
          <Spinner className="text-ui-fg-subtle animate-spin" aria-label="Loading" />
        </div>
      ) : (
        <DataTable instance={table}>
          <DataTable.Toolbar className="flex items-center justify-between gap-2">
            <DataTable.Search placeholder="Search by name" />
            <div className="w-40">
              <Select
                value={status}
                onValueChange={(value) => {
                  setStatus(value as CampaignStatus | "all")
                  setPagination({ pageSize: CAMPAIGN_PAGE_SIZE, pageIndex: 0 })
                }}
              >
                <Select.Trigger aria-label="Status">
                  <Select.Value />
                </Select.Trigger>
                <Select.Content>
                  {STATUS_OPTIONS.map((option) => (
                    <Select.Item key={option.value} value={option.value}>
                      {option.label}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
            </div>
          </DataTable.Toolbar>
          <DataTable.Table emptyState={emptyState} />
          <DataTable.Pagination />
        </DataTable>
      )}
      <CreateCampaignModal open={creating} onOpenChange={setCreating} />
      <Toaster />
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Home campaigns",
  icon: Photo,
})

export default HomeCampaignsPage
