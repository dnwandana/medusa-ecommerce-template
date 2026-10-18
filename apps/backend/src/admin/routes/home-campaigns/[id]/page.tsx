import { EllipsisHorizontal, Spinner } from "@medusajs/icons"
import {
  Button,
  Container,
  Drawer,
  DropdownMenu,
  Heading,
  IconButton,
  StatusBadge,
  Tabs,
  Text,
  Toaster,
  toast,
  usePrompt,
} from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { FormEvent, ReactNode, useEffect, useRef, useState } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { CampaignFormFields } from "../../../components/campaign-form-fields"
import {
  AdminHomeCampaign,
  CAMPAIGN_SECTIONS,
  CampaignForm,
  CampaignFormErrors,
  toCampaignForm,
  toCampaignPayload,
  validateCampaignForm,
} from "../../../lib/campaign-form"
import {
  campaignErrorText,
  campaignStatusBadge,
  DELETE_PROMPT,
  formatCampaignDate,
  publishPrompt,
  UNPUBLISH_PROMPT,
} from "../../../lib/campaign-list"
import { heroPreview, linkSummary, statusText } from "../../../lib/campaign-preview"
import { sdk } from "../../../lib/sdk"

type Section = keyof typeof CAMPAIGN_SECTIONS

// The list, the live campaign and this page all have keys that start with this key, so one
// invalidation reloads all of them.
const CAMPAIGNS_KEY = ["home-campaigns"]

const SECTION_TITLES: Record<Section, { title: string; edit: string }> = {
  content: { title: "Content", edit: "Edit content" },
  link: { title: "Link", edit: "Edit link" },
  images: { title: "Images", edit: "Edit images" },
}

type CampaignAction = "publish" | "unpublish" | "duplicate" | "delete"

const ACTION_REQUESTS: Record<
  CampaignAction,
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

const fileName = (url: string): string => {
  try {
    return decodeURIComponent(new URL(url).pathname.split("/").pop() || url)
  } catch {
    return url
  }
}

const SectionHeader = ({ title, action }: { title: string; action?: ReactNode }) => (
  <div className="flex items-center justify-between gap-x-4 px-6 py-4">
    <Heading level="h2">{title}</Heading>
    {action}
  </div>
)

// One row of label and value. A blank value shows "-".
const Row = ({ label, value }: { label: string; value: ReactNode }) => (
  <div className="grid grid-cols-[120px_1fr] gap-x-4 py-1">
    <Text size="small" leading="compact" weight="plus" className="text-ui-fg-subtle">
      {label}
    </Text>
    <Text size="small" leading="compact" className="break-words">
      {value || "-"}
    </Text>
  </div>
)

const ImageRow = ({ label, url, empty }: { label: string; url: string | null; empty: string }) => (
  <div className="flex items-center gap-x-3 px-6 py-4">
    <div className="bg-ui-bg-subtle border-ui-border-base flex h-12 w-20 shrink-0 items-center justify-center overflow-hidden rounded-md border">
      {url && <img src={url} alt="" className="h-full w-full object-cover" />}
    </div>
    <div className="flex min-w-0 flex-col">
      <Text size="small" leading="compact" weight="plus">
        {label}
      </Text>
      <Text size="small" className="text-ui-fg-subtle truncate">
        {url ? fileName(url) : empty}
      </Text>
    </div>
  </div>
)

// Edits the fields of one section. The route takes the full body, so the save sends all fields
// and checks only the fields of the section. The body has no status, so a live campaign stays
// live.
const EditSectionDrawer = ({
  campaign,
  section,
  onClose,
}: {
  campaign: AdminHomeCampaign
  section: Section | null
  onClose: () => void
}) => {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<CampaignForm>(() => toCampaignForm(campaign))
  const [errors, setErrors] = useState<CampaignFormErrors>({})

  // The form resets only when the Drawer opens. A reload of the campaign in the background must
  // not remove the typed values.
  const campaignRef = useRef(campaign)
  campaignRef.current = campaign
  useEffect(() => {
    if (section) {
      setForm(toCampaignForm(campaignRef.current))
      setErrors({})
    }
  }, [section])

  const save = useMutation({
    mutationFn: (body: Record<string, string | null>) =>
      sdk.client.fetch(`/admin/home-campaigns/${campaign.id}`, { method: "POST", body }),
    onSuccess: async () => {
      toast.success("The home campaign is saved.")
      onClose()
      await queryClient.invalidateQueries({ queryKey: CAMPAIGNS_KEY })
    },
    // The form keeps the typed values, so staff can correct them and save again.
    onError: (error) =>
      toast.error(campaignErrorText(error, "The home campaign was not saved. Try again.")),
  })

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    if (!section) {
      return
    }
    const found = validateCampaignForm(form, CAMPAIGN_SECTIONS[section])
    setErrors(found)
    if (Object.keys(found).length === 0) {
      save.mutate(toCampaignPayload(form))
    }
  }

  return (
    <Drawer open={section !== null} onOpenChange={(open) => !open && onClose()}>
      <Drawer.Content>
        <form onSubmit={onSubmit} noValidate className="flex flex-1 flex-col overflow-hidden">
          <Drawer.Header>
            <Drawer.Title asChild>
              <Heading>{section ? SECTION_TITLES[section].edit : ""}</Heading>
            </Drawer.Title>
            <Drawer.Description className="sr-only">
              Change the fields of this section of the home campaign.
            </Drawer.Description>
          </Drawer.Header>
          <Drawer.Body className="flex-1 overflow-auto">
            {section && (
              <CampaignFormFields
                form={form}
                errors={errors}
                onChange={(patch) => setForm((current) => ({ ...current, ...patch }))}
                sections={[section]}
              />
            )}
          </Drawer.Body>
          <Drawer.Footer>
            <Drawer.Close asChild>
              <Button type="button" size="small" variant="secondary" disabled={save.isPending}>
                Cancel
              </Button>
            </Drawer.Close>
            <Button type="submit" size="small" isLoading={save.isPending} disabled={save.isPending}>
              Save
            </Button>
          </Drawer.Footer>
        </form>
      </Drawer.Content>
    </Drawer>
  )
}

// A small copy of the storefront hero: the image, then the eyebrow, the title, the text and the
// button.
const HeroPreviewSection = ({ campaign }: { campaign: AdminHomeCampaign }) => {
  const [locale, setLocale] = useState<"en" | "id">("en")
  const hero = heroPreview(toCampaignForm(campaign), locale)
  return (
    <Container className="divide-y p-0">
      <div className="flex items-start justify-between gap-x-4 px-6 py-4">
        <div>
          <Heading level="h2">Preview</Heading>
          <Text size="small" className="text-ui-fg-subtle">
            The hero on the home page
          </Text>
        </div>
        <Tabs value={locale} onValueChange={(value) => setLocale(value as "en" | "id")}>
          <Tabs.List>
            <Tabs.Trigger value="en">EN</Tabs.Trigger>
            <Tabs.Trigger value="id">ID</Tabs.Trigger>
          </Tabs.List>
        </Tabs>
      </div>
      <div className="flex flex-col gap-y-3 px-6 py-4">
        <div className="bg-ui-bg-subtle aspect-[2/1] overflow-hidden rounded-md">
          {campaign.image_url && (
            <img src={campaign.image_url} alt="" className="h-full w-full object-cover" />
          )}
        </div>
        {hero.eyebrow && (
          <Text size="xsmall" className="text-ui-fg-subtle uppercase tracking-wide">
            {hero.eyebrow}
          </Text>
        )}
        <Heading level="h3" className="text-xl">
          {hero.title.map((part, index) =>
            part.italic ? <em key={index}>{part.text}</em> : <span key={index}>{part.text}</span>
          )}
        </Heading>
        {hero.text && (
          <Text size="small" className="text-ui-fg-subtle">
            {hero.text}
          </Text>
        )}
        <div>
          <span className="bg-ui-button-inverted text-ui-fg-on-inverted txt-compact-small-plus inline-flex rounded-md px-3 py-1.5">
            {hero.button}
          </span>
        </div>
      </div>
    </Container>
  )
}

const HomeCampaignPage = () => {
  const { id = "" } = useParams()
  const navigate = useNavigate()
  const prompt = usePrompt()
  const queryClient = useQueryClient()
  const [editing, setEditing] = useState<Section | null>(null)

  const { data, isLoading, isError } = useQuery<{ home_campaign: AdminHomeCampaign }>({
    queryKey: [...CAMPAIGNS_KEY, id],
    queryFn: () => sdk.client.fetch(`/admin/home-campaigns/${id}`),
  })
  const campaign = data?.home_campaign

  // The publish texts name the live campaign that the publish ends.
  const { data: liveData } = useQuery<{ home_campaigns: AdminHomeCampaign[] }>({
    queryKey: [...CAMPAIGNS_KEY, "live"],
    queryFn: () =>
      sdk.client.fetch("/admin/home-campaigns", { query: { status: "live", limit: 1 } }),
  })
  const live = liveData?.home_campaigns[0]
  const liveName = live && live.id !== id ? live.name : null

  // The form of the Link section uses the same query key, so the list loads once.
  const { data: categoryData } = useQuery({
    queryKey: ["campaign-categories"],
    queryFn: () => sdk.admin.productCategory.list({ limit: 200, fields: "id,name" }),
  })
  const categoryName =
    categoryData?.product_categories.find((category) => category.id === campaign?.link_category_id)
      ?.name ?? null

  const runAction = useMutation({
    mutationFn: (action: CampaignAction) =>
      sdk.client.fetch<{ home_campaign?: AdminHomeCampaign }>(ACTION_REQUESTS[action].path(id), {
        method: ACTION_REQUESTS[action].method,
      }),
    onSuccess: async (result, action) => {
      toast.success(ACTION_REQUESTS[action].success)
      if (action === "delete") {
        navigate("/home-campaigns")
      } else if (action === "duplicate" && result.home_campaign) {
        navigate(`/home-campaigns/${result.home_campaign.id}`)
      }
      await queryClient.invalidateQueries({ queryKey: CAMPAIGNS_KEY })
    },
    onError: (error, action) =>
      toast.error(campaignErrorText(error, ACTION_REQUESTS[action].failure)),
  })

  const onAction = async (action: CampaignAction) => {
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
        confirmText:
          action === "publish" ? "Publish" : action === "unpublish" ? "Unpublish" : "Delete",
        cancelText: "Cancel",
      })
      if (!confirmed) {
        return
      }
    }
    runAction.mutate(action)
  }

  if (isLoading) {
    return (
      <div className="flex justify-center px-6 py-10">
        <Spinner className="text-ui-fg-subtle animate-spin" aria-label="Loading" />
      </div>
    )
  }

  if (isError || !campaign) {
    return (
      <Container className="px-6 py-4">
        <Text size="small">
          The home campaign did not load. It does not exist, or it is deleted.
        </Text>
      </Container>
    )
  }

  const badge = campaignStatusBadge(campaign.status)
  const form = toCampaignForm(campaign)
  const editButton = (section: Section) => (
    <Button type="button" size="small" variant="secondary" onClick={() => setEditing(section)}>
      Edit
    </Button>
  )

  return (
    <div className="flex flex-col gap-y-3">
      <Container className="flex items-start justify-between gap-x-4 px-6 py-4">
        <div className="flex min-w-0 flex-col gap-y-1">
          <div className="flex items-center gap-x-2">
            <Heading className="truncate">{campaign.name}</Heading>
            <StatusBadge color={badge.color}>{badge.label}</StatusBadge>
          </div>
          <Text size="small" className="text-ui-fg-subtle">
            Created {formatCampaignDate(campaign.created_at)} · Updated{" "}
            {formatCampaignDate(campaign.updated_at)}
          </Text>
        </div>
        <DropdownMenu>
          <DropdownMenu.Trigger asChild>
            <IconButton size="small" variant="transparent" aria-label="Actions">
              <EllipsisHorizontal />
            </IconButton>
          </DropdownMenu.Trigger>
          <DropdownMenu.Content align="end">
            <DropdownMenu.Item disabled={runAction.isPending} onClick={() => onAction("duplicate")}>
              Duplicate
            </DropdownMenu.Item>
            {campaign.status === "draft" && (
              <DropdownMenu.Item disabled={runAction.isPending} onClick={() => onAction("delete")}>
                Delete
              </DropdownMenu.Item>
            )}
          </DropdownMenu.Content>
        </DropdownMenu>
      </Container>

      <div className="flex flex-col gap-3 xl:flex-row xl:items-start">
        <div className="flex min-w-0 flex-1 flex-col gap-y-3">
          <Container className="divide-y p-0">
            <SectionHeader title={SECTION_TITLES.content.title} action={editButton("content")} />
            <div className="grid grid-cols-1 gap-6 px-6 py-4 md:grid-cols-2">
              {(
                [
                  ["en", "English"],
                  ["id", "Bahasa Indonesia"],
                ] as const
              ).map(([locale, label]) => (
                <div key={locale} className="flex flex-col">
                  <Text size="small" leading="compact" weight="plus" className="pb-2">
                    {label}
                  </Text>
                  <Row label="Eyebrow" value={form[`eyebrow_${locale}`]} />
                  <Row label="Title" value={form[`title_${locale}`]} />
                  <Row label="Text" value={form[`text_${locale}`]} />
                  <Row label="Button label" value={form[`button_label_${locale}`]} />
                </div>
              ))}
            </div>
          </Container>

          <Container className="divide-y p-0">
            <SectionHeader title={SECTION_TITLES.link.title} action={editButton("link")} />
            <div className="px-6 py-4">
              <Row label="Button link" value={linkSummary(form, categoryName)} />
            </div>
          </Container>

          <Container className="divide-y p-0">
            <SectionHeader title={SECTION_TITLES.images.title} action={editButton("images")} />
            <ImageRow label="Image" url={campaign.image_url} empty="-" />
            <ImageRow
              label="Mobile image"
              url={campaign.mobile_image_url}
              empty="Phones show the image."
            />
          </Container>
        </div>

        <div className="flex w-full flex-col gap-y-3 xl:max-w-[440px]">
          <Container className="divide-y p-0">
            <SectionHeader
              title="Status"
              action={<StatusBadge color={badge.color}>{badge.label}</StatusBadge>}
            />
            <div className="flex flex-col gap-y-3 px-6 py-4">
              <div>
                <Row label="Went live" value={formatCampaignDate(campaign.went_live_at)} />
                <Row label="Ended" value={formatCampaignDate(campaign.ended_at)} />
              </div>
              <Text size="small" className="text-ui-fg-subtle">
                {statusText(campaign.status, liveName)}
              </Text>
              <div className="flex justify-end">
                {campaign.status === "live" ? (
                  <Button
                    type="button"
                    size="small"
                    variant="secondary"
                    isLoading={runAction.isPending}
                    disabled={runAction.isPending}
                    onClick={() => onAction("unpublish")}
                  >
                    Unpublish
                  </Button>
                ) : (
                  <Button
                    type="button"
                    size="small"
                    isLoading={runAction.isPending}
                    disabled={runAction.isPending}
                    onClick={() => onAction("publish")}
                  >
                    Publish
                  </Button>
                )}
              </div>
            </div>
          </Container>

          <HeroPreviewSection campaign={campaign} />
        </div>
      </div>

      <EditSectionDrawer campaign={campaign} section={editing} onClose={() => setEditing(null)} />
      <Toaster />
    </div>
  )
}

export default HomeCampaignPage
