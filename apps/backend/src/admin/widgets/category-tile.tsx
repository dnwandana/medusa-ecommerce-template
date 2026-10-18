import { defineWidgetConfig } from "@medusajs/admin-sdk"
import type { DetailWidgetProps, HttpTypes } from "@medusajs/framework/types"
import { Photo } from "@medusajs/icons"
import { Button, Container, Heading, Label, Switch, Text, toast, usePrompt } from "@medusajs/ui"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ChangeEvent, useRef } from "react"
import {
  CategoryTile,
  readCategoryTile,
  removeTilePrompt,
  tileCaption,
  withCategoryTile,
} from "../lib/category-tile"
import { sdk } from "../lib/sdk"

// Chooses the category for the home page tiles and sets an image for its tile. Without an
// uploaded image, the tile shows the thumbnail of the newest product in the category.
const CategoryTileWidget = ({
  data: category,
}: DetailWidgetProps<HttpTypes.AdminProductCategory>) => {
  const queryClient = useQueryClient()
  const prompt = usePrompt()
  const fileInput = useRef<HTMLInputElement>(null)
  const tile = readCategoryTile(category.metadata)
  const newestKey = ["category-tile-newest", category.id]

  const { data: newestData, isLoading: newestLoading } = useQuery({
    queryKey: newestKey,
    queryFn: () =>
      sdk.admin.product.list({
        category_id: [category.id],
        order: "-created_at",
        limit: 1,
        fields: "id,title,thumbnail",
      }),
  })
  const newest = newestData?.products[0] ?? null

  // The mutation waits for the reload of the category, so the switch and the image row show the
  // saved values when the controls are enabled again.
  const save = useMutation({
    mutationFn: async ({ next, file }: { next: CategoryTile; file?: File }) => {
      let imageUrl = next.imageUrl
      if (file) {
        const { files } = await sdk.admin.upload.create({ files: [file] })
        imageUrl = files[0].url
      }
      return sdk.admin.productCategory.update(category.id, {
        metadata: withCategoryTile(category.metadata, { ...next, imageUrl }),
      })
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["product_categories"] }),
        queryClient.invalidateQueries({ queryKey: newestKey }),
      ])
      toast.success("The home page tile is saved.")
    },
    onError: () => toast.error("The home page tile was not saved. Try again."),
  })

  const onFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    // A second choice of the same file must start a new upload.
    event.target.value = ""
    if (file) {
      save.mutate({ next: tile, file })
    }
  }

  const onRemove = async () => {
    const confirmed = await prompt({
      ...removeTilePrompt(category.name),
      confirmText: "Remove image",
      cancelText: "Cancel",
    })
    if (confirmed) {
      save.mutate({ next: { ...tile, imageUrl: null } })
    }
  }

  const imageSrc = tile.imageUrl ?? newest?.thumbnail ?? null

  return (
    <Container className="divide-y p-0">
      <div className="px-6 py-4">
        <Heading level="h2">Home page tile</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          The category tiles on the home page link to the category.
        </Text>
      </div>
      <div className="flex items-start gap-x-3 px-6 py-4">
        <Switch
          id="category-tile-show"
          checked={tile.show}
          disabled={save.isPending}
          onCheckedChange={(show) => save.mutate({ next: { ...tile, show } })}
        />
        <div className="flex flex-col">
          <Label htmlFor="category-tile-show" size="small" weight="plus">
            Show on the home page
          </Label>
          <Text size="small" className="text-ui-fg-subtle">
            {tile.show
              ? "The home page shows this category as a tile."
              : "The home page does not show this category."}
          </Text>
        </div>
      </div>
      {tile.show && (
        <div className="flex flex-col gap-y-3 px-6 py-4">
          <div className="flex items-start gap-x-3">
            <div className="bg-ui-bg-subtle border-ui-border-base flex h-16 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border">
              {imageSrc ? (
                <img src={imageSrc} alt="" className="h-full w-full object-cover" />
              ) : (
                <Photo className="text-ui-fg-muted" />
              )}
            </div>
            <div className="flex flex-col gap-y-1">
              <Text size="small" leading="compact" weight="plus">
                {tile.imageUrl ? "Uploaded" : "Automatic: newest product"}
              </Text>
              <Text size="small" className="text-ui-fg-subtle">
                {newestLoading && !tile.imageUrl
                  ? "Loading the newest product."
                  : tileCaption(tile, newest, category.name)}
              </Text>
            </div>
          </div>
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onFile}
          />
          <div className="flex justify-end gap-x-2">
            {tile.imageUrl && (
              <Button
                type="button"
                size="small"
                variant="secondary"
                disabled={save.isPending}
                onClick={onRemove}
              >
                Remove image
              </Button>
            )}
            <Button
              type="button"
              size="small"
              variant="secondary"
              isLoading={save.isPending}
              disabled={save.isPending}
              onClick={() => fileInput.current?.click()}
            >
              {tile.imageUrl ? "Replace" : "Upload"}
            </Button>
          </div>
        </div>
      )}
    </Container>
  )
}

export const config = defineWidgetConfig({
  zone: "product_category.details.side",
})

export default CategoryTileWidget
