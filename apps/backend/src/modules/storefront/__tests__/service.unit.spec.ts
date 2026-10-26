import StorefrontModuleService from "../service"

const proto = StorefrontModuleService.prototype as any

describe("storefront service: settings", () => {
  it("returns the defaults when there is no settings row", async () => {
    const self = { listStorefrontSettings: jest.fn().mockResolvedValue([]) }
    expect(await proto.getSettings.call(self)).toEqual({
      new_badge_days: 30,
      low_stock_threshold: 5,
      price_limits: [],
    })
  })

  it("creates the row on the first save with sorted price limits", async () => {
    const self = {
      listStorefrontSettings: jest.fn().mockResolvedValue([]),
      createStorefrontSettings: jest.fn().mockImplementation(async (v) => ({ id: "ss_1", ...v })),
    }
    const saved = await proto.saveSettings.call(self, {
      new_badge_days: 14,
      low_stock_threshold: 3,
      price_limits: [500000, 200000],
    })
    expect(self.createStorefrontSettings).toHaveBeenCalledWith({
      new_badge_days: 14,
      low_stock_threshold: 3,
      price_limits: [200000, 500000],
    })
    expect(saved.price_limits).toEqual([200000, 500000])
  })

  it("updates the one row when it exists", async () => {
    const self = {
      listStorefrontSettings: jest.fn().mockResolvedValue([{ id: "ss_1" }]),
      updateStorefrontSettings: jest.fn().mockImplementation(async (v) => v),
    }
    await proto.saveSettings.call(self, {
      new_badge_days: 0,
      low_stock_threshold: 0,
      price_limits: [],
    })
    expect(self.updateStorefrontSettings).toHaveBeenCalledWith(
      expect.objectContaining({ id: "ss_1" })
    )
  })
})

describe("storefront service: contact", () => {
  const values = {
    email: "store@example.com",
    phone: "+6281234567890",
    whatsapp: null,
    address: "Jl. Merdeka 1\nJakarta",
    social_links: [{ network: "instagram", url: "https://instagram.com/store" }],
  }

  it("returns the empty contact when there is no row", async () => {
    const self = { listStorefrontContacts: jest.fn().mockResolvedValue([]) }
    expect(await proto.getContact.call(self)).toEqual({
      email: null,
      phone: null,
      whatsapp: null,
      address: null,
      social_links: [],
    })
  })

  it("returns an empty list for a null social_links column", async () => {
    const self = {
      listStorefrontContacts: jest.fn().mockResolvedValue([
        {
          id: "sc_1",
          email: "a@b.co",
          phone: null,
          whatsapp: null,
          address: null,
          social_links: null,
        },
      ]),
    }
    expect((await proto.getContact.call(self)).social_links).toEqual([])
  })

  it("creates the row on the first save", async () => {
    const self = {
      listStorefrontContacts: jest.fn().mockResolvedValue([]),
      createStorefrontContacts: jest.fn().mockImplementation(async (v) => ({ id: "sc_1", ...v })),
    }
    expect(await proto.setContact.call(self, values)).toEqual(values)
    expect(self.createStorefrontContacts).toHaveBeenCalledWith(values)
  })

  it("updates the one row when it exists", async () => {
    const self = {
      listStorefrontContacts: jest.fn().mockResolvedValue([{ id: "sc_1" }]),
      updateStorefrontContacts: jest.fn().mockImplementation(async (v) => v),
    }
    expect(await proto.setContact.call(self, values)).toEqual(values)
    expect(self.updateStorefrontContacts).toHaveBeenCalledWith({ id: "sc_1", ...values })
  })
})

describe("storefront service: store colours", () => {
  const existing = [{ id: "col_1", name: "Sage", hex: "#9aa68c" }]

  it("rejects a name that differs only in case", async () => {
    const self = { listStoreColours: jest.fn().mockResolvedValue(existing) }
    await expect(proto.createColour.call(self, { name: " sage ", hex: "#000000" })).rejects.toThrow(
      "A colour with the name sage already exists."
    )
  })

  it("saves a trimmed name and a lower-case hex", async () => {
    const self = {
      listStoreColours: jest.fn().mockResolvedValue(existing),
      createStoreColours: jest.fn().mockImplementation(async (v) => ({ id: "col_2", ...v })),
    }
    await proto.createColour.call(self, { name: " Olive ", hex: "#6B7A3A" })
    expect(self.createStoreColours).toHaveBeenCalledWith({ name: "Olive", hex: "#6b7a3a" })
  })

  it("lets a colour keep its own name on update", async () => {
    const self = {
      listStoreColours: jest.fn().mockResolvedValue(existing),
      updateStoreColours: jest.fn().mockImplementation(async (v) => v),
    }
    await proto.updateColour.call(self, "col_1", { name: "SAGE", hex: "#9aa68d" })
    expect(self.updateStoreColours).toHaveBeenCalledWith({
      id: "col_1",
      name: "SAGE",
      hex: "#9aa68d",
    })
  })

  it("throws NOT_FOUND for an unknown id", async () => {
    const self = { listStoreColours: jest.fn().mockResolvedValue(existing) }
    await expect(proto.updateColour.call(self, "col_x", { hex: "#000000" })).rejects.toThrow(
      "The colour col_x was not found."
    )
  })
})

describe("storefront service: getLiveCampaign", () => {
  it("asks for the live row and returns null when there is none", async () => {
    const self = { listHomeCampaigns: jest.fn().mockResolvedValue([]) }
    expect(await proto.getLiveCampaign.call(self)).toBeNull()
    expect(self.listHomeCampaigns).toHaveBeenCalledWith({ status: "live" }, { take: 1 })
  })
})

describe("storefront service: campaign actions", () => {
  const row = {
    id: "hcmp_1",
    name: "Holiday 2026",
    status: "live",
    image_url: "https://assets.example.com/holiday.jpg",
    title_en: "Gifts",
    title_id: "Hadiah",
    button_label_en: "Shop",
    button_label_id: "Belanja",
    link_type: "all_products",
    went_live_at: new Date("2026-10-01"),
    ended_at: null,
    created_at: new Date("2026-09-30"),
    updated_at: new Date("2026-10-01"),
    deleted_at: null,
  }
  const self = (status: string) => ({
    retrieveHomeCampaign: jest.fn().mockResolvedValue({ ...row, status }),
    updateHomeCampaigns: jest.fn().mockImplementation(async (v) => v),
    createHomeCampaigns: jest.fn().mockImplementation(async (v) => ({ id: "hcmp_2", ...v })),
    softDeleteHomeCampaigns: jest.fn().mockResolvedValue(undefined),
  })

  it("ends a live campaign", async () => {
    const s = self("live")
    await proto.unpublishCampaign.call(s, "hcmp_1")
    expect(s.updateHomeCampaigns).toHaveBeenCalledWith(
      expect.objectContaining({ id: "hcmp_1", status: "ended", ended_at: expect.any(Date) })
    )
  })

  it("refuses to unpublish a draft", async () => {
    await expect(proto.unpublishCampaign.call(self("draft"), "hcmp_1")).rejects.toThrow(
      "Only a live home campaign can be unpublished."
    )
  })

  it("copies a campaign into a new draft", async () => {
    const s = self("live")
    await proto.duplicateCampaign.call(s, "hcmp_1")
    const input = s.createHomeCampaigns.mock.calls[0][0]
    expect(input).toMatchObject({
      name: "Holiday 2026 (copy)",
      status: "draft",
      title_en: "Gifts",
      went_live_at: null,
      ended_at: null,
    })
    for (const key of ["id", "created_at", "updated_at", "deleted_at"]) {
      expect(input).not.toHaveProperty(key)
    }
  })

  it("deletes a draft only", async () => {
    const draft = self("draft")
    await proto.deleteDraftCampaign.call(draft, "hcmp_1")
    expect(draft.softDeleteHomeCampaigns).toHaveBeenCalledWith("hcmp_1")
    await expect(proto.deleteDraftCampaign.call(self("ended"), "hcmp_1")).rejects.toThrow(
      "Only a draft home campaign can be deleted."
    )
  })
})
