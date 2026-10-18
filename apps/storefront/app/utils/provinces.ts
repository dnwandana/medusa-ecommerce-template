// The 38 provinces of Indonesia. The names are the same in the two locales, so they have no
// locale key. The select shows this order.
export const PROVINCES = [
  "Aceh",
  "Bali",
  "Banten",
  "Bengkulu",
  "DI Yogyakarta",
  "DKI Jakarta",
  "Gorontalo",
  "Jambi",
  "Jawa Barat",
  "Jawa Tengah",
  "Jawa Timur",
  "Kalimantan Barat",
  "Kalimantan Selatan",
  "Kalimantan Tengah",
  "Kalimantan Timur",
  "Kalimantan Utara",
  "Kepulauan Bangka Belitung",
  "Kepulauan Riau",
  "Lampung",
  "Maluku",
  "Maluku Utara",
  "Nusa Tenggara Barat",
  "Nusa Tenggara Timur",
  "Papua",
  "Papua Barat",
  "Papua Barat Daya",
  "Papua Pegunungan",
  "Papua Selatan",
  "Papua Tengah",
  "Riau",
  "Sulawesi Barat",
  "Sulawesi Selatan",
  "Sulawesi Tengah",
  "Sulawesi Tenggara",
  "Sulawesi Utara",
  "Sumatera Barat",
  "Sumatera Selatan",
  "Sumatera Utara",
] as const

// Returns the list name that matches the value. The compare ignores the case and the outer
// spaces, so a saved address with "dki jakarta" stays valid. No match gives "".
export function toProvince(value: string | null | undefined): string {
  const key = (value ?? "").trim().toLowerCase()
  if (key === "") {
    return ""
  }
  return PROVINCES.find((name) => name.toLowerCase() === key) ?? ""
}

// Returns true when the value is a province of the list.
export function isProvince(value: string | null | undefined): boolean {
  return toProvince(value) !== ""
}
