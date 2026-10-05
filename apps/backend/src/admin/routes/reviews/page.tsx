import { defineRouteConfig } from "@medusajs/admin-sdk"
import { ChatBubbleLeftRight } from "@medusajs/icons"
import {
  Container,
  createDataTableColumnHelper,
  createDataTableCommandHelper,
  DataTable,
  DataTablePaginationState,
  DataTableRowSelectionState,
  Heading,
  Select,
  StatusBadge,
  Toaster,
  toast,
  useDataTable,
} from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"
import { useMemo, useState } from "react"
import { Link } from "react-router-dom"
import {
  AdminReview,
  authorName,
  listQuery,
  PAGE_SIZE,
  ReviewStatus,
  statusColor,
} from "../../lib/review-format"
import { sdk } from "../../lib/sdk"

type ReviewList = { reviews: AdminReview[]; count: number; limit: number; offset: number }

const columnHelper = createDataTableColumnHelper<AdminReview>()

const columns = [
  columnHelper.select(),
  columnHelper.accessor("product", {
    header: "Product",
    cell: ({ row }) => (
      <Link to={`/products/${row.original.product_id}`}>
        {row.original.product?.title ?? row.original.product_id}
      </Link>
    ),
  }),
  columnHelper.accessor("rating", { header: "Rating" }),
  columnHelper.accessor("first_name", {
    header: "Author",
    cell: ({ row }) => authorName(row.original),
  }),
  columnHelper.accessor("content", { header: "Content" }),
  columnHelper.accessor("status", {
    header: "Status",
    cell: ({ row }) => (
      <StatusBadge color={statusColor(row.original.status)}>{row.original.status}</StatusBadge>
    ),
  }),
]

const commandHelper = createDataTableCommandHelper()

const ReviewsPage = () => {
  const [pagination, setPagination] = useState<DataTablePaginationState>({
    pageSize: PAGE_SIZE,
    pageIndex: 0,
  })
  const [rowSelection, setRowSelection] = useState<DataTableRowSelectionState>({})
  const [status, setStatus] = useState<ReviewStatus | "all">("all")

  const query = useMemo(() => listQuery(pagination.pageIndex, status), [pagination.pageIndex, status])

  const { data, isLoading, refetch } = useQuery<ReviewList>({
    queryKey: ["reviews", query],
    queryFn: () => sdk.client.fetch("/admin/reviews", { query }),
  })

  // Sends the new status for the selected rows, then loads the list again.
  const setReviewStatus = async (selection: DataTableRowSelectionState, next: "approved" | "rejected") => {
    try {
      await sdk.client.fetch("/admin/reviews/status", {
        method: "POST",
        body: { ids: Object.keys(selection), status: next },
      })
      toast.success(`The reviews are ${next}.`)
      setRowSelection({})
      await refetch()
    } catch {
      toast.error("The status change failed. Try again.")
    }
  }

  const commands = [
    commandHelper.command({
      label: "Approve",
      shortcut: "A",
      action: (selection) => setReviewStatus(selection, "approved"),
    }),
    commandHelper.command({
      label: "Reject",
      shortcut: "R",
      action: (selection) => setReviewStatus(selection, "rejected"),
    }),
  ]

  const table = useDataTable({
    columns,
    data: data?.reviews ?? [],
    rowCount: data?.count ?? 0,
    isLoading,
    getRowId: (row) => row.id,
    pagination: { state: pagination, onPaginationChange: setPagination },
    rowSelection: { state: rowSelection, onRowSelectionChange: setRowSelection },
    commands,
  })

  return (
    <Container className="divide-y p-0">
      <DataTable instance={table}>
        <DataTable.Toolbar className="flex items-center justify-between gap-2">
          <Heading>Reviews</Heading>
          <div className="w-40">
            <Select
              value={status}
              onValueChange={(value) => {
                setStatus(value as ReviewStatus | "all")
                setPagination({ pageSize: PAGE_SIZE, pageIndex: 0 })
                setRowSelection({})
              }}
            >
              <Select.Trigger aria-label="Status filter">
                <Select.Value />
              </Select.Trigger>
              <Select.Content>
                <Select.Item value="all">All statuses</Select.Item>
                <Select.Item value="pending">Pending</Select.Item>
                <Select.Item value="approved">Approved</Select.Item>
                <Select.Item value="rejected">Rejected</Select.Item>
              </Select.Content>
            </Select>
          </div>
        </DataTable.Toolbar>
        <DataTable.Table />
        <DataTable.Pagination />
        <DataTable.CommandBar selectedLabel={(count) => `${count} selected`} />
      </DataTable>
      <Toaster />
    </Container>
  )
}

export const config = defineRouteConfig({
  label: "Reviews",
  icon: ChatBubbleLeftRight,
})

export default ReviewsPage
