import regionalConfig from "@/config/regional-stores.json";

export interface RegionalStore {
  name: string;
  domain: string;
  language: string;
  locale: string;
  currency: string;
}

export interface Product {
  id: string;
  name: string;
  name_es: string;
  slug: string;
}

const SUPPORTED_REGIONS = new Set([
  "BO",
  "CL",
  "CR",
  "MX",
  "BR",
  "CO",
  "EC",
  "PE",
]);

function readCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(
    new RegExp("(?:^|; )" + name + "=([^;]*)"),
  );
  return match ? decodeURIComponent(match[1]) : null;
}

/**
 * Detect user's country/region.
 *
 * Priority:
 *   1. `nf_country` cookie set by Netlify Edge Function (geo-IP)
 *   2. `navigator.language` mapping (fallback for local dev / cookie-less)
 *   3. CO (Colombia) — primary market
 */
export function detectUserRegion(): string {
  if (typeof window === "undefined") return "CO";

  const geoCookie = readCookie("nf_country")?.toUpperCase();
  if (geoCookie && SUPPORTED_REGIONS.has(geoCookie)) {
    return geoCookie;
  }

  const browserLang = navigator.language || navigator.languages?.[0] || "es-CO";

  const langMap: { [key: string]: string } = {
    "es-BO": "BO",
    "es-CL": "CL",
    "es-CR": "CR",
    "es-MX": "MX",
    "pt-BR": "BR",
    pt: "BR",
    "es-CO": "CO",
    "es-EC": "EC",
    "es-PE": "PE",
    es: "CO",
  };

  if (langMap[browserLang]) {
    return langMap[browserLang];
  }

  const baseLang = browserLang.split("-")[0];
  if (langMap[baseLang]) {
    return langMap[baseLang];
  }

  return "CO";
}

/**
 * Get region configuration
 */
export function getRegionConfig(regionCode: string): RegionalStore | null {
  const region = regionalConfig.regions[regionCode as keyof typeof regionalConfig.regions];
  return region || null;
}

export function isProductAvailable(
  productKey: string,
  regionCode: string,
): boolean {
  const product = (regionalConfig.products as any)[productKey];
  if (!product) return false;
  const availability = product.availability;
  if (availability === "all") return true;
  if (Array.isArray(availability)) return availability.includes(regionCode);
  return false;
}

/**
 * Build product URL for specific region.
 * If the product is not sold in the user's country, falls back to that
 * country's full catalog so the user lands on a real store, not a 404.
 */
export function buildProductUrl(
  productKey: string,
  regionCode: string = "CO",
): string {
  const region = getRegionConfig(regionCode);
  const product = (regionalConfig.products as any)[productKey];

  if (!region || !product) {
    return `https://4l.shop/${regionalConfig.distributor_code}`;
  }

  if (!isProductAvailable(productKey, regionCode)) {
    return buildStoreUrl(regionCode);
  }

  const regionalProduct =
    product.regional_config?.[regionCode] ?? product.regional_config?.default;

  if (!regionalProduct) {
    return buildStoreUrl(regionCode);
  }

  const { id, slug, extra_path } = regionalProduct;
  const extraPath = extra_path || "";

  return `${region.domain}/${regionalConfig.distributor_code}/product/${slug}/${id}${extraPath}`;
}

/**
 * Build full catalog store URL for specific region
 */
export function buildStoreUrl(regionCode: string = "CO"): string {
  const region = getRegionConfig(regionCode);

  if (!region) {
    return `https://4l.shop/${regionalConfig.distributor_code}`;
  }

  return `${region.domain}/${regionalConfig.distributor_code}${regionalConfig.store_urls.full_catalog}`;
}

/**
 * Get all available regions
 */
export function getAllRegions(): { code: string; config: RegionalStore }[] {
  return Object.entries(regionalConfig.regions).map(([code, config]) => ({
    code,
    config: config as RegionalStore,
  }));
}

/**
 * Client-side function to get regional product link
 * Automatically detects user region
 */
export function getRegionalProductLink(productKey: string): string {
  const userRegion = detectUserRegion();
  return buildProductUrl(productKey, userRegion);
}

/**
 * Client-side function to get regional store link
 * Automatically detects user region
 */
export function getRegionalStoreLink(): string {
  const userRegion = detectUserRegion();
  return buildStoreUrl(userRegion);
}