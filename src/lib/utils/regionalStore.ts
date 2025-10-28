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

/**
 * Detect user's country/region from browser
 * Falls back to CO (Colombia) if detection fails
 */
export function detectUserRegion(): string {
  if (typeof window === "undefined") return "CO";

  // Try to detect from browser language
  const browserLang = navigator.language || navigator.languages?.[0] || "es-CO";

  // Map browser language to region code
  const langMap: { [key: string]: string } = {
    "es-BO": "BO",
    "es-CL": "CL",
    "es-CR": "CR",
    "es-MX": "MX",
    "pt-BR": "BR",
    "pt": "BR",
    "es-CO": "CO",
    "es-EC": "EC",
    "es-PE": "PE",
    "es": "CO", // Default Spanish to Colombia
  };

  // Check exact match first
  if (langMap[browserLang]) {
    return langMap[browserLang];
  }

  // Check partial match (es-XX -> es)
  const baseLang = browserLang.split("-")[0];
  if (langMap[baseLang]) {
    return langMap[baseLang];
  }

  // Default to Colombia
  return "CO";
}

/**
 * Get region configuration
 */
export function getRegionConfig(regionCode: string): RegionalStore | null {
  const region = regionalConfig.regions[regionCode as keyof typeof regionalConfig.regions];
  return region || null;
}

/**
 * Build product URL for specific region
 * Handles regional variations in product IDs and slugs
 */
export function buildProductUrl(
  productKey: string,
  regionCode: string = "CO"
): string {
  const region = getRegionConfig(regionCode);
  const product = regionalConfig.products[productKey as keyof typeof regionalConfig.products];

  if (!region || !product) {
    // Fallback to generic 4Life shop link
    return `https://4l.shop/${regionalConfig.distributor_code}`;
  }

  // Get regional config for this product (or use default)
  const regionalProduct = product.regional_config?.[regionCode as keyof typeof product.regional_config] ||
                         product.regional_config?.default;

  if (!regionalProduct) {
    return `https://4l.shop/${regionalConfig.distributor_code}`;
  }

  const { id, slug, extra_path } = regionalProduct as any;
  const extraPath = extra_path || "";

  // Build URL: {domain}/{distributor_code}/product/{product_slug}/{product_id}{extra_path}
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