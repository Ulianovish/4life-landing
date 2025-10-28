# Regional Routing & Geo-Targeting Documentation

**Project:** 4Life Transfer Factor Landing Page
**Feature:** Automatic Regional Product Link Routing
**Distributor Code:** MildredBriyitBarrero
**Last Updated:** September 29, 2025

---

## Overview

This landing page implements intelligent regional routing to automatically direct users to their local 4Life store based on browser language detection. This ensures customers can purchase products in their local currency and language.

---

## How It Works

### 1. Browser Language Detection

The system detects the user's region using `navigator.language`:

```javascript
// Examples:
"en-US" → United States
"es-CO" → Colombia
"es-MX" → Mexico
"es" → Mexico (default Spanish)
```

### 2. Regional URL Generation

URLs are automatically generated using this pattern:

```
{regional_domain}/{distributor_code}/product/{product_slug}/{product_id}
```

**Example for Colombia:**
```
https://colombia.4life.com/MildredBriyitBarrero/product/transfer-factor-plus-tri-factor/89
```

### 3. Fallback System

If region detection fails or unsupported region:
- Falls back to: `https://colombia.4life.com/MildredBriyitBarrero/shop/all`
- Default region: **Colombia (CO)**

---

## Supported Regions

| Region Code | Country | Domain | Currency |
|-------------|---------|--------|----------|
| BO | Bolivia | bolivia.4life.com | BOB |
| CL | Chile | chile.4life.com | CLP |
| CR | Costa Rica | costarica.4life.com | CRC |
| MX | México | mexico.4life.com | MXN |
| BR | Brasil | brazil.4life.com | BRL |
| CO | Colombia | colombia.4life.com | COP |
| EC | Ecuador | ecuador.4life.com | USD |
| PE | Perú | peru.4life.com | PEN |

---

## Products Configuration

### Product Keys and Regional Variations

**Note:** Products have different IDs and slugs per country!

| Product Key | Availability | Notes |
|-------------|-------------|--------|
| `transfer-factor-classic` | All 8 countries | ID: 95 (standard) |
| `transfer-factor-plus` | All 8 countries | ID: 89 (default), Chile uses ID: 1117 |
| `transfer-factor-boost` | All 8 countries | **Unique ID per country** (see table below) |

#### Transfer Factor Boost - Regional IDs

| Country | Product ID | Slug | Extra Path |
|---------|-----------|------|------------|
| Bolivia | 3637 | 4life-transfer-factorr-boost---bolivia | - |
| Chile | 3781 | tf---boost---chile | - |
| Costa Rica | 3614 | 4life-tf-boost---costa-rica | - |
| México | 3552 | tf-boost---mex | - |
| Brasil | 3807 | tf-boost---brazil | - |
| Colombia | 3550 | 4life-tf-boost | /105 |
| Ecuador | 3619 | 4life-tf-boost---ecuador | /105 |
| Perú | 3772 | tf-boost-polvo-oral | - |

---

## File Structure

### Configuration Files

**`src/config/regional-stores.json`**
- Contains all region configurations
- Product mappings
- Distributor code
- Domain patterns

### Utility Functions

**`src/lib/utils/regionalStore.ts`**
```typescript
// Main functions:
detectUserRegion(): string
buildProductUrl(productKey, regionCode): string
buildStoreUrl(regionCode): string
getRegionalProductLink(productKey): string
```

### React Components

**`src/layouts/function-components/RegionalBuyButton.tsx`**
- Smart "Comprar Ahora" button
- Auto-detects region
- Shows regional store name
- Props:
  - `productKey`: Product identifier
  - `label`: Button text (default: "Comprar Ahora")
  - `className`: Custom CSS classes
  - `fallbackUrl`: URL if detection fails

**`src/layouts/function-components/RegionalStoreLink.tsx`**
- Full catalog CTA section
- Shows trust indicators
- Links to complete store catalog

---

## Usage Examples

### 1. Product Card with Regional Button

```astro
---
import RegionalBuyButton from "@/layouts/function-components/RegionalBuyButton";
---

<RegionalBuyButton
  productKey="transfer-factor-plus"
  label="Comprar Ahora"
  fallbackUrl="https://4l.shop/12750834"
  client:load
/>
```

### 2. Full Catalog Link

```astro
---
import RegionalStoreLink from "@/layouts/function-components/RegionalStoreLink";
---

<RegionalStoreLink client:load />
```

### 3. Manual URL Building (TypeScript)

```typescript
import { buildProductUrl, detectUserRegion } from "@/lib/utils/regionalStore";

const userRegion = detectUserRegion(); // "CO"
const productUrl = buildProductUrl("transfer-factor-plus", userRegion);
// Result: https://colombia.4life.com/12750834/product/transfer-factor-plus-tri-factor/89
```

---

## Adding New Regions

To add support for a new region:

### Step 1: Update `regional-stores.json`

```json
{
  "regions": {
    "BR": {
      "name": "Brasil",
      "domain": "https://brasil.4life.com",
      "language": "pt",
      "locale": "pt-BR",
      "currency": "BRL"
    }
  }
}
```

### Step 2: Update Language Detection

In `regionalStore.ts`, add to `langMap`:

```typescript
const langMap: { [key: string]: string } = {
  // ... existing mappings
  "pt-BR": "BR",
  "pt": "BR",
};
```

### Step 3: Add hreflang Tag

In `src/layouts/Base.astro`:

```html
<link rel="alternate" hreflang="pt-BR" href={config.site.base_url} />
```

---

## Testing Regional Routing

### Test in Browser

1. **Change browser language:**
   - Chrome: Settings → Languages
   - Firefox: Preferences → Language
   - Safari: System Preferences → Language & Region

2. **Clear cache and reload page**

3. **Click "Comprar Ahora" button**

4. **Verify URL matches expected regional domain**

### Manual Testing by Region

```javascript
// Open browser console on landing page

// Test Colombia
localStorage.setItem('test-region', 'CO');
location.reload();

// Test Mexico
localStorage.setItem('test-region', 'MX');
location.reload();

// Clear test
localStorage.removeItem('test-region');
location.reload();
```

### Expected Results

**User in Colombia (es-CO):**
- Button links to: `colombia.4life.com/12750834/product/...`
- Shows: "Tienda para: Colombia"

**User in United States (en-US):**
- Button links to: `usa.4life.com/12750834/product/...`
- Shows: "Tienda para: United States"

---

## SEO Considerations

### hreflang Implementation

The site includes hreflang tags for all supported regions:

```html
<link rel="alternate" hreflang="en-US" href="..." />
<link rel="alternate" hreflang="es-CO" href="..." />
<link rel="alternate" hreflang="es-MX" href="..." />
<!-- ... etc -->
<link rel="alternate" hreflang="x-default" href="..." />
```

This tells search engines:
- Same content serves multiple regions
- Each region should see appropriate version
- Prevents duplicate content penalties

### Open Graph Locales

```html
<meta property="og:locale" content="es_LA" />
<meta property="og:locale:alternate" content="es_PR" />
<meta property="og:locale:alternate" content="es_CO" />
<meta property="og:locale:alternate" content="es_MX" />
```

Optimized for WhatsApp and Facebook sharing across Latin America.

---

## Product URL Examples

### Transfer Factor Plus

**Colombia:**
```
https://colombia.4life.com/12750834/product/transfer-factor-plus-tri-factor/89
```

**Mexico:**
```
https://mexico.4life.com/12750834/product/transfer-factor-plus-tri-factor/89
```

**United States:**
```
https://usa.4life.com/12750834/product/transfer-factor-plus-tri-factor/89
```

### Transfer Factor Classic

**Puerto Rico:**
```
https://puertorico.4life.com/12750834/product/transfer-factor-tri-factor/88
```

**Peru:**
```
https://peru.4life.com/12750834/product/transfer-factor-tri-factor/88
```

### Full Store Catalog

**Argentina:**
```
https://argentina.4life.com/12750834/shop/all
```

**Chile:**
```
https://chile.4life.com/12750834/shop/all
```

---

## Troubleshooting

### Issue: Wrong Region Detected

**Cause:** Browser language not matching expected region

**Solution:**
1. Check `navigator.language` in console
2. Verify mapping in `regionalStore.ts` langMap
3. Add missing language variant

### Issue: Broken Product Links

**Cause:** Product ID or slug incorrect

**Solution:**
1. Verify product configuration in `regional-stores.json`
2. Test URL manually in browser
3. Confirm distributor code (12750834) is correct

### Issue: Button Not Updating

**Cause:** React component not hydrating

**Solution:**
1. Ensure `client:load` directive is present
2. Check browser console for errors
3. Verify TypeScript compilation succeeded

---

## Analytics Tracking

To track which regions are purchasing:

```javascript
// Add to RegionalBuyButton.tsx onClick handler
const handleClick = () => {
  // Google Analytics
  gtag('event', 'purchase_click', {
    region: userRegion,
    product: productKey,
    url: productUrl
  });

  // Facebook Pixel
  fbq('track', 'InitiateCheckout', {
    region: userRegion,
    product: productKey
  });
};
```

---

## Maintenance

### Update Distributor Code

If distributor code changes, update in **one place**:

**`src/config/regional-stores.json`**
```json
{
  "distributor_code": "NEW_CODE_HERE"
}
```

All links will automatically update.

### Update Product IDs

If 4Life changes product IDs:

**`src/config/regional-stores.json`**
```json
{
  "products": {
    "transfer-factor-plus": {
      "id": "NEW_ID_HERE",
      "slug": "new-slug-if-changed"
    }
  }
}
```

---

## Performance

### Caching Strategy

- Regional config loaded once per page
- Detection runs on component mount
- Results cached in component state
- No repeated API calls

### Bundle Size Impact

- `regional-stores.json`: ~2KB
- `regionalStore.ts`: ~1.5KB
- React components: ~3KB
- **Total:** ~6.5KB (minified + gzipped: ~2KB)

---

## Future Enhancements

### Potential Improvements

1. **IP-based Geo-location**
   - Use Cloudflare Workers for server-side detection
   - More accurate than browser language
   - Requires backend integration

2. **User Region Selector**
   - Manual override dropdown
   - Store preference in localStorage
   - Allow users to shop other regions

3. **Multi-currency Display**
   - Show prices in local currency
   - Fetch from 4Life API
   - Update dynamically

4. **A/B Testing**
   - Test different CTA copy per region
   - Track conversion rates by country
   - Optimize messaging

---

## Support & Questions

**Configuration Issues:** Check `regional-stores.json`
**Detection Issues:** Check `regionalStore.ts` langMap
**UI Issues:** Check React component props
**SEO Issues:** Check hreflang tags in Base.astro

**4Life Official Support:** https://www.4life.com/corp/home/Contact