import { Spinner } from "@medusajs/icons"
import {
  Button,
  Heading,
  Hint,
  Input,
  Label,
  RadioGroup,
  Select,
  Tabs,
  Text,
  Textarea,
  toast,
} from "@medusajs/ui"
import { useQuery } from "@tanstack/react-query"
import { ChangeEvent, DragEvent, ReactNode, useId, useRef, useState } from "react"
import {
  CampaignForm,
  CampaignFormErrors,
  CampaignLinkType,
  tabsWithErrors,
} from "../lib/campaign-form"
import { sdk } from "../lib/sdk"

type Section = "content" | "link" | "images"

type FieldsProps = {
  form: CampaignForm
  errors: CampaignFormErrors
  onChange: (patch: Partial<CampaignForm>) => void
}

// The props of one section. A Drawer has its own title, so a single section shows no heading.
type SectionProps = FieldsProps & { prefix: string; showTitle: boolean }

// One field with its label, its hint and its error.
const Field = ({
  id,
  label,
  optional,
  hint,
  error,
  children,
}: {
  id: string
  label: string
  optional?: boolean
  hint?: string
  error?: string
  children: ReactNode
}) => (
  <div className="flex flex-col gap-y-2">
    <Label htmlFor={id} size="small" weight="plus">
      {label}
      {optional && <span className="text-ui-fg-muted font-normal"> (Optional)</span>}
    </Label>
    {children}
    {hint && <Hint>{hint}</Hint>}
    {error && <Hint variant="error">{error}</Hint>}
  </div>
)

const SectionTitle = ({ show, children }: { show: boolean; children: ReactNode }) =>
  show ? <Heading level="h2">{children}</Heading> : null

const LANGUAGES: { tab: "en" | "id"; label: string }[] = [
  { tab: "en", label: "English" },
  { tab: "id", label: "Bahasa Indonesia" },
]

const ContentFields = ({ form, errors, onChange, prefix, showTitle }: SectionProps) => {
  const tabs = tabsWithErrors(errors)
  return (
    <div className="flex flex-col gap-y-4">
      <SectionTitle show={showTitle}>Content</SectionTitle>
      <Field
        id={`${prefix}-name`}
        label="Name"
        hint="Staff see the name. Customers do not see it."
        error={errors.name}
      >
        <Input
          id={`${prefix}-name`}
          maxLength={120}
          value={form.name}
          aria-invalid={Boolean(errors.name)}
          onChange={(event) => onChange({ name: event.target.value })}
        />
      </Field>
      <Tabs defaultValue="en">
        <Tabs.List>
          {LANGUAGES.map(({ tab, label }) => (
            <Tabs.Trigger key={tab} value={tab}>
              {label}
              {tabs.includes(tab) && (
                <span
                  className="bg-ui-tag-red-icon ml-2 inline-block h-1.5 w-1.5 rounded-full"
                  aria-label="This tab has an error"
                />
              )}
            </Tabs.Trigger>
          ))}
        </Tabs.List>
        {LANGUAGES.map(({ tab }) => {
          const eyebrow = `eyebrow_${tab}` as const
          const title = `title_${tab}` as const
          const text = `text_${tab}` as const
          const button = `button_label_${tab}` as const
          return (
            <Tabs.Content key={tab} value={tab} className="flex flex-col gap-y-4 pt-4">
              <Field id={`${prefix}-${eyebrow}`} label="Eyebrow" optional error={errors[eyebrow]}>
                <Input
                  id={`${prefix}-${eyebrow}`}
                  value={form[eyebrow]}
                  aria-invalid={Boolean(errors[eyebrow])}
                  onChange={(event) => onChange({ [eyebrow]: event.target.value })}
                />
              </Field>
              <Field
                id={`${prefix}-${title}`}
                label="Title"
                hint="Put *asterisks* around a word to set it in italics."
                error={errors[title]}
              >
                <Input
                  id={`${prefix}-${title}`}
                  value={form[title]}
                  aria-invalid={Boolean(errors[title])}
                  onChange={(event) => onChange({ [title]: event.target.value })}
                />
              </Field>
              <Field id={`${prefix}-${text}`} label="Text" optional error={errors[text]}>
                <Textarea
                  id={`${prefix}-${text}`}
                  rows={3}
                  value={form[text]}
                  aria-invalid={Boolean(errors[text])}
                  onChange={(event) => onChange({ [text]: event.target.value })}
                />
              </Field>
              <Field id={`${prefix}-${button}`} label="Button label" error={errors[button]}>
                <Input
                  id={`${prefix}-${button}`}
                  value={form[button]}
                  aria-invalid={Boolean(errors[button])}
                  onChange={(event) => onChange({ [button]: event.target.value })}
                />
              </Field>
            </Tabs.Content>
          )
        })}
      </Tabs>
    </div>
  )
}

const LINK_TYPES: { value: CampaignLinkType; label: string; description: string }[] = [
  { value: "category", label: "Category", description: "The button opens a category page." },
  { value: "all_products", label: "All products", description: "The button opens /products." },
  { value: "path", label: "Store path", description: "The button opens a path in the store." },
]

const LinkFields = ({ form, errors, onChange, prefix, showTitle }: SectionProps) => {
  const { data, isLoading } = useQuery({
    queryKey: ["campaign-categories"],
    queryFn: () => sdk.admin.productCategory.list({ limit: 200, fields: "id,name" }),
  })
  const categories = data?.product_categories ?? []

  return (
    <div className="flex flex-col gap-y-4">
      <SectionTitle show={showTitle}>Link</SectionTitle>
      <RadioGroup
        value={form.link_type}
        onValueChange={(value) => onChange({ link_type: value as CampaignLinkType })}
        className="flex flex-col gap-y-2"
        aria-label="Button link"
      >
        {LINK_TYPES.map((type) => (
          <RadioGroup.ChoiceBox
            key={type.value}
            value={type.value}
            label={type.label}
            description={type.description}
          />
        ))}
      </RadioGroup>
      {form.link_type === "category" && (
        <Field id={`${prefix}-category`} label="Category" error={errors.link_category_id}>
          <Select
            value={form.link_category_id}
            onValueChange={(value) => onChange({ link_category_id: value })}
            disabled={isLoading}
          >
            <Select.Trigger
              id={`${prefix}-category`}
              aria-invalid={Boolean(errors.link_category_id)}
            >
              <Select.Value placeholder="Select a category" />
            </Select.Trigger>
            <Select.Content>
              {categories.map((category) => (
                <Select.Item key={category.id} value={category.id}>
                  {category.name}
                </Select.Item>
              ))}
            </Select.Content>
          </Select>
        </Field>
      )}
      {form.link_type === "path" && (
        <Field
          id={`${prefix}-path`}
          label="Store path"
          hint="Start the path with /. The storefront adds the locale."
          error={errors.link_path}
        >
          <Input
            id={`${prefix}-path`}
            placeholder="/products"
            value={form.link_path}
            aria-invalid={Boolean(errors.link_path)}
            onChange={(event) => onChange({ link_path: event.target.value })}
          />
        </Field>
      )}
    </div>
  )
}

// Returns the file name at the end of an image URL, for the row of a set image.
const fileName = (url: string): string => {
  try {
    return decodeURIComponent(new URL(url).pathname.split("/").pop() || url)
  } catch {
    return url
  }
}

// One image with a drop zone. The file goes to the file module, and the field gets the URL. A
// failed upload keeps the old value.
const ImageField = ({
  id,
  label,
  optional,
  hint,
  value,
  error,
  onChange,
}: {
  id: string
  label: string
  optional?: boolean
  hint?: string
  value: string
  error?: string
  onChange: (url: string) => void
}) => {
  const input = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)

  const upload = async (file: File | undefined) => {
    if (!file) {
      return
    }
    if (!file.type.startsWith("image/")) {
      toast.error("Select an image file.")
      return
    }
    setUploading(true)
    try {
      const { files } = await sdk.admin.upload.create({ files: [file] })
      onChange(files[0].url)
    } catch {
      toast.error("The image was not uploaded. Try again.")
    } finally {
      setUploading(false)
    }
  }

  const onFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    // A second choice of the same file must start a new upload.
    event.target.value = ""
    void upload(file)
  }

  const onDrop = (event: DragEvent<HTMLButtonElement>) => {
    event.preventDefault()
    setDragging(false)
    void upload(event.dataTransfer.files[0])
  }

  return (
    <Field id={id} label={label} optional={optional} hint={hint} error={error}>
      <input
        ref={input}
        id={id}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFile}
      />
      <button
        type="button"
        disabled={uploading}
        aria-invalid={Boolean(error)}
        onClick={() => input.current?.click()}
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`bg-ui-bg-component flex flex-col items-center gap-y-1 rounded-lg border border-dashed px-6 py-6 text-center outline-none focus-visible:shadow-borders-focus ${
          dragging ? "border-ui-border-interactive" : "border-ui-border-strong"
        }`}
      >
        {uploading ? (
          <Spinner className="text-ui-fg-subtle animate-spin" />
        ) : (
          <Text size="small" leading="compact" weight="plus">
            Upload images
          </Text>
        )}
        <Text size="small" className="text-ui-fg-subtle">
          Drag and drop an image here or click to upload. Use 2400 × 1200 px or larger.
        </Text>
      </button>
      {value && (
        <div className="flex items-center gap-x-3">
          <div className="bg-ui-bg-subtle border-ui-border-base flex h-10 w-16 shrink-0 items-center justify-center overflow-hidden rounded-md border">
            <img src={value} alt="" className="h-full w-full object-cover" />
          </div>
          <Text size="small" className="min-w-0 flex-1 truncate">
            {fileName(value)}
          </Text>
          <Button
            type="button"
            size="small"
            variant="transparent"
            disabled={uploading}
            onClick={() => onChange("")}
          >
            Remove
          </Button>
        </div>
      )}
    </Field>
  )
}

const ImageFields = ({ form, errors, onChange, prefix, showTitle }: SectionProps) => (
  <div className="flex flex-col gap-y-4">
    <SectionTitle show={showTitle}>Images</SectionTitle>
    <ImageField
      id={`${prefix}-image`}
      label="Image"
      value={form.image_url}
      error={errors.image_url}
      onChange={(image_url) => onChange({ image_url })}
    />
    <ImageField
      id={`${prefix}-mobile-image`}
      label="Mobile image"
      optional
      hint="Phones show this image. Without it, phones show the image above."
      value={form.mobile_image_url}
      error={errors.mobile_image_url}
      onChange={(mobile_image_url) => onChange({ mobile_image_url })}
    />
  </div>
)

/**
 * Shows the fields of the given sections of the home campaign form. The create modal shows all
 * three sections. Each Drawer of the campaign page shows one section.
 */
export const CampaignFormFields = ({
  form,
  errors,
  onChange,
  sections,
}: FieldsProps & { sections: Section[] }) => {
  const prefix = useId()
  const showTitle = sections.length > 1
  return (
    <div className="flex flex-col gap-y-8">
      {sections.includes("content") && (
        <ContentFields
          form={form}
          errors={errors}
          onChange={onChange}
          prefix={prefix}
          showTitle={showTitle}
        />
      )}
      {sections.includes("link") && (
        <LinkFields
          form={form}
          errors={errors}
          onChange={onChange}
          prefix={prefix}
          showTitle={showTitle}
        />
      )}
      {sections.includes("images") && (
        <ImageFields
          form={form}
          errors={errors}
          onChange={onChange}
          prefix={prefix}
          showTitle={showTitle}
        />
      )}
    </div>
  )
}
