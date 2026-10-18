import { Button, FocusModal, Heading, Text, toast } from "@medusajs/ui"
import { useMutation, useQueryClient } from "@tanstack/react-query"
import { FormEvent, useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import {
  AdminHomeCampaign,
  CampaignForm,
  CampaignFormErrors,
  emptyCampaignForm,
  toCampaignPayload,
  validateCampaignForm,
} from "../lib/campaign-form"
import { campaignErrorText } from "../lib/campaign-list"
import { sdk } from "../lib/sdk"
import { CampaignFormFields } from "./campaign-form-fields"

/** Creates a draft home campaign, then opens its page. */
export const CreateCampaignModal = ({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) => {
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const [form, setForm] = useState<CampaignForm>(emptyCampaignForm)
  const [errors, setErrors] = useState<CampaignFormErrors>({})

  // Each open starts with an empty form.
  useEffect(() => {
    if (open) {
      setForm(emptyCampaignForm())
      setErrors({})
    }
  }, [open])

  const create = useMutation({
    mutationFn: (body: Record<string, string | null>) =>
      sdk.client.fetch<{ home_campaign: AdminHomeCampaign }>("/admin/home-campaigns", {
        method: "POST",
        body,
      }),
    onSuccess: async ({ home_campaign }) => {
      toast.success("The home campaign is saved as a draft.")
      onOpenChange(false)
      await queryClient.invalidateQueries({ queryKey: ["home-campaigns"] })
      navigate(`/home-campaigns/${home_campaign.id}`)
    },
    // The form keeps the typed values, so staff can correct them and save again.
    onError: (error) =>
      toast.error(campaignErrorText(error, "The home campaign was not saved. Try again.")),
  })

  const onSubmit = (event: FormEvent) => {
    event.preventDefault()
    const found = validateCampaignForm(form)
    setErrors(found)
    if (Object.keys(found).length === 0) {
      create.mutate(toCampaignPayload(form))
    }
  }

  return (
    <FocusModal open={open} onOpenChange={onOpenChange}>
      <FocusModal.Content>
        <form onSubmit={onSubmit} noValidate className="flex h-full flex-col overflow-hidden">
          <FocusModal.Header />
          <FocusModal.Body className="flex flex-1 justify-center overflow-auto px-6 py-16">
            <div className="flex w-full max-w-[720px] flex-col gap-y-8">
              <div>
                <FocusModal.Title asChild>
                  <Heading>Create home campaign</Heading>
                </FocusModal.Title>
                <FocusModal.Description asChild>
                  <Text size="small" className="text-ui-fg-subtle">
                    A new home campaign is a draft. Publish it from its page.
                  </Text>
                </FocusModal.Description>
              </div>
              <CampaignFormFields
                form={form}
                errors={errors}
                onChange={(patch) => setForm((current) => ({ ...current, ...patch }))}
                sections={["content", "link", "images"]}
              />
            </div>
          </FocusModal.Body>
          <FocusModal.Footer>
            <FocusModal.Close asChild>
              <Button type="button" size="small" variant="secondary" disabled={create.isPending}>
                Cancel
              </Button>
            </FocusModal.Close>
            <Button
              type="submit"
              size="small"
              isLoading={create.isPending}
              disabled={create.isPending}
            >
              Save
            </Button>
          </FocusModal.Footer>
        </form>
      </FocusModal.Content>
    </FocusModal>
  )
}
