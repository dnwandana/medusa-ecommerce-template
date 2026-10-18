import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { createAdminWithToken } from "../helpers/actors"

jest.setTimeout(180 * 1000)

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    describe("/admin/storefront/colours", () => {
      it("creates, lists, edits and deletes a colour", async () => {
        const { headers } = await createAdminWithToken(getContainer())
        const created = await api.post(
          "/admin/storefront/colours",
          { name: "Sage", hex: "#9AA68C" },
          { headers }
        )
        expect(created.data.colour).toMatchObject({ name: "Sage", hex: "#9aa68c" })
        const id = created.data.colour.id

        const edited = await api.post(
          `/admin/storefront/colours/${id}`,
          { hex: "#8a967c" },
          { headers }
        )
        expect(edited.data.colour).toMatchObject({ id, name: "Sage", hex: "#8a967c" })

        expect((await api.get("/admin/storefront/colours", { headers })).data.colours).toHaveLength(
          1
        )

        const deleted = await api.delete(`/admin/storefront/colours/${id}`, { headers })
        expect(deleted.data).toEqual({ id, object: "store_colour", deleted: true })
      })

      it("rejects a duplicate name that differs only in case", async () => {
        const { headers } = await createAdminWithToken(getContainer())
        await api.post("/admin/storefront/colours", { name: "Sage", hex: "#9aa68c" }, { headers })
        const response = await api
          .post("/admin/storefront/colours", { name: "SAGE", hex: "#000000" }, { headers })
          .catch((e: any) => e.response)
        expect(response.status).toBe(422)
        expect(response.data.message).toContain("SAGE")
      })

      it("rejects a hex that is not six digits", async () => {
        const { headers } = await createAdminWithToken(getContainer())
        const response = await api
          .post("/admin/storefront/colours", { name: "Olive", hex: "#abc" }, { headers })
          .catch((e: any) => e.response)
        expect(response.status).toBe(400)
      })

      it("returns 404 for an unknown id", async () => {
        const { headers } = await createAdminWithToken(getContainer())
        const response = await api
          .delete("/admin/storefront/colours/col_unknown", { headers })
          .catch((e: any) => e.response)
        expect(response.status).toBe(404)
      })
    })
  },
})
