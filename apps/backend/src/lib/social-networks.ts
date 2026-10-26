import type { SocialLink } from "./store-contact"

// The social networks that the owner can link to. The storefront has a second copy of the ids in
// apps/storefront/app/utils/socialNetworks.ts. Change the two copies together.
export type SocialNetwork = { id: string; name: string; hosts: readonly string[] }

const PINTEREST_HOSTS = [
  "pinterest.com",
  "pinterest.at",
  "pinterest.ca",
  "pinterest.ch",
  "pinterest.cl",
  "pinterest.co.kr",
  "pinterest.co.uk",
  "pinterest.com.au",
  "pinterest.com.mx",
  "pinterest.de",
  "pinterest.dk",
  "pinterest.es",
  "pinterest.fr",
  "pinterest.ie",
  "pinterest.it",
  "pinterest.jp",
  "pinterest.nz",
  "pinterest.ph",
  "pinterest.pt",
  "pinterest.se",
  "pin.it",
]

const SHOPEE_HOSTS = [
  "shopee.co.id",
  "shopee.sg",
  "shopee.com.my",
  "shopee.ph",
  "shopee.co.th",
  "shopee.vn",
  "shopee.tw",
  "shopee.com.br",
  "shopee.com.mx",
  "shopee.com.co",
  "shopee.cl",
  "shp.ee",
]

const LAZADA_HOSTS = [
  "lazada.co.id",
  "lazada.sg",
  "lazada.com.my",
  "lazada.com.ph",
  "lazada.co.th",
  "lazada.vn",
]

const AMAZON_HOSTS = [
  "amazon.com",
  "amazon.ae",
  "amazon.ca",
  "amazon.cn",
  "amazon.co.jp",
  "amazon.co.uk",
  "amazon.co.za",
  "amazon.com.au",
  "amazon.com.be",
  "amazon.com.br",
  "amazon.com.mx",
  "amazon.com.tr",
  "amazon.de",
  "amazon.eg",
  "amazon.es",
  "amazon.fr",
  "amazon.in",
  "amazon.it",
  "amazon.nl",
  "amazon.pl",
  "amazon.sa",
  "amazon.se",
  "amazon.sg",
  "a.co",
  "amzn.to",
  "amzn.eu",
  "amzn.asia",
]

// The hosts include the short hosts of the share links, for example youtu.be and lin.ee.
export const SOCIAL_NETWORKS: readonly SocialNetwork[] = [
  { id: "instagram", name: "Instagram", hosts: ["instagram.com", "instagr.am"] },
  { id: "tiktok", name: "TikTok", hosts: ["tiktok.com"] },
  { id: "facebook", name: "Facebook", hosts: ["facebook.com", "fb.com", "fb.me"] },
  { id: "x", name: "X", hosts: ["x.com", "twitter.com"] },
  { id: "youtube", name: "YouTube", hosts: ["youtube.com", "youtu.be"] },
  { id: "threads", name: "Threads", hosts: ["threads.net", "threads.com"] },
  { id: "pinterest", name: "Pinterest", hosts: PINTEREST_HOSTS },
  { id: "linkedin", name: "LinkedIn", hosts: ["linkedin.com", "lnkd.in"] },
  { id: "telegram", name: "Telegram", hosts: ["t.me", "telegram.me"] },
  { id: "line", name: "LINE", hosts: ["line.me", "lin.ee"] },
  { id: "shopee", name: "Shopee", hosts: SHOPEE_HOSTS },
  { id: "tokopedia", name: "Tokopedia", hosts: ["tokopedia.com", "tokopedia.link"] },
  { id: "lazada", name: "Lazada", hosts: LAZADA_HOSTS },
  { id: "amazon", name: "Amazon", hosts: AMAZON_HOSTS },
]

export const SOCIAL_NETWORK_IDS: readonly string[] = SOCIAL_NETWORKS.map((network) => network.id)

// Returns true when the URL uses https and its host is a host of the network or a subdomain of
// one. The check compares whole labels, so "evilinstagram.com" and "instagram.com.evil.io" fail.
export function isAllowedSocialUrl(network: string, url: string): boolean {
  const entry = SOCIAL_NETWORKS.find((item) => item.id === network)
  if (!entry) {
    return false
  }
  let parsed: URL
  try {
    parsed = new URL(url)
  } catch {
    return false
  }
  if (parsed.protocol !== "https:") {
    return false
  }
  const host = parsed.hostname
  return entry.hosts.some((allowed) => host === allowed || host.endsWith(`.${allowed}`))
}

// Returns the links of a known network, in the same order. A saved link can name a network that
// a later code change removed from the list.
export function knownSocialLinks(links: SocialLink[]): SocialLink[] {
  return links.filter((link) => SOCIAL_NETWORK_IDS.includes(link.network))
}
