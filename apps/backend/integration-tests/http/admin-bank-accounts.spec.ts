import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import { createAdminWithToken } from "../helpers/actors"

jest.setTimeout(180 * 1000)

medusaIntegrationTestRunner({
  testSuite: ({ api, getContainer }) => {
    describe("/admin/bank-accounts", () => {
      it("creates, lists, edits, orders, and deletes bank accounts", async () => {
        const { headers } = await createAdminWithToken(getContainer())
        const a = (
          await api.post(
            "/admin/bank-accounts",
            { bank_name: "BCA", account_number: "1234567890", account_holder: "Toko", rank: 1 },
            { headers }
          )
        ).data.bank_account
        const b = (
          await api.post(
            "/admin/bank-accounts",
            { bank_name: "BRI", account_number: "9876543210", account_holder: "Toko", rank: 0 },
            { headers }
          )
        ).data.bank_account

        expect(
          (await api.get("/admin/bank-accounts", { headers })).data.bank_accounts.map(
            (x: any) => x.id
          )
        ).toEqual([b.id, a.id])

        const edited = await api.post(
          `/admin/bank-accounts/${a.id}`,
          { is_active: false, rank: 0 },
          { headers }
        )
        expect(edited.data.bank_account).toMatchObject({ id: a.id, is_active: false, rank: 0 })

        const deleted = await api.delete(`/admin/bank-accounts/${b.id}`, { headers })
        expect(deleted.data).toEqual({ id: b.id, object: "bank_account", deleted: true })
        expect(
          (await api.get("/admin/bank-accounts", { headers })).data.bank_accounts
        ).toHaveLength(1)
      })

      it("puts a new account with no rank after the other accounts", async () => {
        const { headers } = await createAdminWithToken(getContainer())
        const create = async (bank_name: string) =>
          (
            await api.post(
              "/admin/bank-accounts",
              { bank_name, account_number: "1234567890", account_holder: "Toko" },
              { headers }
            )
          ).data.bank_account

        const first = await create("BCA")
        const second = await create("BRI")
        const third = await create("BNI")

        expect([first.rank, second.rank, third.rank]).toEqual([0, 1, 2])
        expect(
          (await api.get("/admin/bank-accounts", { headers })).data.bank_accounts.map(
            (x: any) => x.id
          )
        ).toEqual([first.id, second.id, third.id])
      })

      it("keeps the leading zeros of the account number", async () => {
        const { headers } = await createAdminWithToken(getContainer())
        const created = await api.post(
          "/admin/bank-accounts",
          { bank_name: "BNI", account_number: "0012345678", account_holder: "Toko" },
          { headers }
        )
        expect(created.data.bank_account.account_number).toBe("0012345678")
      })

      it("rejects an account number with letters and an empty bank name", async () => {
        const { headers } = await createAdminWithToken(getContainer())
        const response = await api
          .post(
            "/admin/bank-accounts",
            { bank_name: " ", account_number: "12ab", account_holder: "Toko" },
            { headers }
          )
          .catch((e: any) => e.response)
        expect(response.status).toBe(400)
      })

      it("returns 404 for an unknown account id", async () => {
        const { headers } = await createAdminWithToken(getContainer())
        const response = await api
          .post("/admin/bank-accounts/ba_missing", { rank: 1 }, { headers })
          .catch((e: any) => e.response)
        expect(response.status).toBe(404)
        expect(response.data.message).toBe("The bank account ba_missing was not found.")
      })

      it("returns 404 when it deletes an unknown account id", async () => {
        const { headers } = await createAdminWithToken(getContainer())
        const response = await api
          .delete("/admin/bank-accounts/ba_missing", { headers })
          .catch((e: any) => e.response)
        expect(response.status).toBe(404)
      })

      it("rejects a request with no admin login", async () => {
        const response = await api.get("/admin/bank-accounts").catch((e: any) => e.response)
        expect(response.status).toBe(401)
      })
    })
  },
})
