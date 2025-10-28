# SEO Testing Checklist - 4Life Transfer Factor Landing Page

**Last Updated:** September 29, 2025
**Status:** Ready for Testing

---

## 1. Structured Data Testing

### Google Rich Results Test
🔗 **URL:** https://search.google.com/test/rich-results

**Test the following structured data:**

- [ ] **Product Schema** - Transfer Factor Plus
  - Expected: Product name, image, brand, offers, aggregate rating
  - Location: `src/layouts/Base.astro:193-220`

- [ ] **Organization Schema** - 4Life Transfer Factor
  - Expected: Company name, logo, description, social profiles
  - Location: `src/layouts/Base.astro:177-190`

- [ ] **Review Schema** - Customer testimonials
  - Expected: 5 individual reviews with ratings and author names
  - Location: `src/layouts/components/Testimonial.astro:26-35`

- [ ] **FAQ Schema** - Preguntas Frecuentes
  - Expected: 4 questions with answers
  - Location: `src/pages/index.astro:107-118`

**How to Test:**
1. Run `npm run build` to generate static site
2. Deploy to staging or use production URL
3. Enter URL in Rich Results Test
4. Verify all schema types appear without errors

---

## 2. Meta Tags Validation

### Open Graph Validator
🔗 **URL:** https://www.opengraph.xyz/

**Verify:**
- [ ] Title: "Transfer Factor Plus 4Life - Fortalece tu Sistema Inmunológico"
- [ ] Description: Compelling Spanish product description
- [ ] Image: Displays correctly (1200x630px recommended)
- [ ] Image dimensions are included (og:image:width, og:image:height)
- [ ] Type: website
- [ ] Locale: es_LA with alternates (es_PR, es_CO, es_MX)
- [ ] Site name: "4Life Transfer Factor"

---

### Twitter Card Validator
🔗 **URL:** https://cards-dev.twitter.com/validator

**Verify:**
- [ ] Card type: summary_large_image
- [ ] Image displays correctly
- [ ] Title and description are appropriate
- [ ] Image alt text is present

---

### WhatsApp Preview
**Test by sharing URL via WhatsApp Web**

**Verify:**
- [ ] Title displays correctly
- [ ] Description is compelling in Spanish
- [ ] Image loads and looks professional
- [ ] Link preview is clean and clickable

---

## 3. Search Engine Validation

### Google Search Console
**After deploying to production:**

- [ ] Submit sitemap.xml
- [ ] Request indexing for homepage
- [ ] Check for mobile usability issues
- [ ] Verify Core Web Vitals
- [ ] Monitor structured data errors

---

### Bing Webmaster Tools
- [ ] Submit URL for indexing
- [ ] Verify structured data is recognized
- [ ] Check mobile-friendliness

---

## 4. Language & Regional Targeting

### hreflang Validation
🔗 **URL:** https://hreflang-validator.com/

**Verify hreflang tags for:**
- [ ] es (general Spanish)
- [ ] es-PR (Puerto Rico)
- [ ] es-CO (Colombia)
- [ ] es-AR (Argentina)
- [ ] es-CL (Chile)
- [ ] es-PE (Peru)
- [ ] es-MX (Mexico)
- [ ] es-VE (Venezuela)
- [ ] es-EC (Ecuador)
- [ ] x-default (fallback)

---

## 5. Technical SEO Checks

### PageSpeed Insights
🔗 **URL:** https://pagespeed.web.dev/

**Target Scores:**
- [ ] Performance: 90+ (Desktop), 80+ (Mobile)
- [ ] Accessibility: 95+
- [ ] Best Practices: 95+
- [ ] SEO: 100

**Check for:**
- [ ] First Contentful Paint (FCP) < 1.8s
- [ ] Largest Contentful Paint (LCP) < 2.5s
- [ ] Cumulative Layout Shift (CLS) < 0.1
- [ ] First Input Delay (FID) < 100ms
- [ ] Preconnect hints are working (Google Fonts)

---

### Mobile-Friendly Test
🔗 **URL:** https://search.google.com/test/mobile-friendly

- [ ] Page is mobile-friendly
- [ ] Text is readable without zooming
- [ ] Tap targets are appropriately sized
- [ ] Content fits within viewport

---

### SSL/Security Check
🔗 **URL:** https://www.ssllabs.com/ssltest/

- [ ] HTTPS is enforced
- [ ] SSL certificate is valid
- [ ] Grade A or A+ rating
- [ ] No mixed content warnings

---

## 6. Accessibility Testing

### WAVE Web Accessibility Evaluation
🔗 **URL:** https://wave.webaim.org/

**Verify:**
- [ ] No errors
- [ ] All images have alt text
- [ ] Proper heading hierarchy (H1 → H2 → H3)
- [ ] Sufficient color contrast
- [ ] Form labels are properly associated
- [ ] ARIA landmarks are correct

---

### Lighthouse Accessibility Audit
**In Chrome DevTools:**
- [ ] Run Lighthouse audit for Accessibility
- [ ] Score 95+
- [ ] Fix any flagged issues

---

## 7. Content & Language Validation

### Manual Checks

**Spanish Language:**
- [ ] HTML lang="es" is set
- [ ] All navigation in Spanish
- [ ] All content in Spanish
- [ ] CTAs properly translated
- [ ] Footer information in Spanish

**Content Quality:**
- [ ] No Lorem Ipsum text
- [ ] All 4Life-specific information is accurate
- [ ] Product descriptions are compelling
- [ ] Testimonials are real and relevant
- [ ] FAQ answers are helpful

---

## 8. Functional Testing

### Navigation & Links
- [ ] All menu items work correctly
- [ ] Anchor links scroll smoothly (#productos, #testimonios)
- [ ] "Comprar Ahora" buttons go to correct shop URL
- [ ] External links open in new tab with rel="noopener"
- [ ] WhatsApp button works (if enabled)
- [ ] Footer links are functional

### Forms
- [ ] Contact form submits properly
- [ ] Form validation works
- [ ] Success/error messages display
- [ ] Email notifications are sent

---

## 9. Cross-Browser Testing

**Test on:**
- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (macOS)
- [ ] Safari (iOS)
- [ ] Edge (latest)
- [ ] Samsung Internet (Android)

**Verify:**
- [ ] Layout renders correctly
- [ ] Images display properly
- [ ] Fonts load correctly
- [ ] Interactive elements work
- [ ] No console errors

---

## 10. Analytics & Tracking

**If analytics are implemented:**
- [ ] Google Analytics tracking code is present
- [ ] Events are firing correctly
- [ ] Conversion tracking is set up
- [ ] Goals are configured
- [ ] UTM parameters work correctly

---

## 11. Social Media Preview Testing

### Facebook Debugger
🔗 **URL:** https://developers.facebook.com/tools/debug/

- [ ] Clear cache for URL
- [ ] Verify image displays correctly
- [ ] Check title and description
- [ ] Ensure no warnings/errors

### LinkedIn Post Inspector
🔗 **URL:** https://www.linkedin.com/post-inspector/

- [ ] Preview looks professional
- [ ] All metadata is correct

---

## 12. Robots & Crawling

### robots.txt Validation
🔗 **View:** `yoursite.com/robots.txt`

**Verify:**
- [ ] File is accessible
- [ ] Allows crawling of main content
- [ ] Disallows only necessary paths (/api/*)
- [ ] Includes sitemap reference (if auto-generated)

### Sitemap Validation
🔗 **View:** `yoursite.com/sitemap-index.xml`

**Verify:**
- [ ] Sitemap is generated (Astro sitemap plugin)
- [ ] All important pages are included
- [ ] Homepage is present
- [ ] Contact page is present
- [ ] No 404 URLs in sitemap
- [ ] Valid XML format

---

## Testing Commands

```bash
# Build the site
npm run build

# Preview production build locally
npm run preview

# Check for build errors
npm run build 2>&1 | grep -i error

# Test locally with proper base URL
# Update config.json base_url temporarily to localhost
```

---

## Priority Issues

**Fix immediately if found:**
1. ❌ Structured data errors
2. ❌ Missing or incorrect hreflang tags
3. ❌ Broken links
4. ❌ Missing alt texts
5. ❌ Poor mobile experience
6. ❌ Slow page speed (>3s)
7. ❌ HTTPS not working
8. ❌ Console errors

---

## Post-Launch Monitoring

**Week 1:**
- [ ] Monitor Google Search Console for errors
- [ ] Check indexing status
- [ ] Review Core Web Vitals
- [ ] Monitor 404 errors

**Week 2-4:**
- [ ] Track search rankings for key terms
- [ ] Monitor structured data in search results
- [ ] Review user behavior analytics
- [ ] Gather customer feedback

---

## Testing Tools Reference

| Tool | URL | Purpose |
|------|-----|---------|
| Google Rich Results Test | https://search.google.com/test/rich-results | Validate structured data |
| PageSpeed Insights | https://pagespeed.web.dev/ | Performance testing |
| Open Graph Debugger | https://www.opengraph.xyz/ | Meta tags validation |
| WAVE | https://wave.webaim.org/ | Accessibility check |
| Mobile-Friendly Test | https://search.google.com/test/mobile-friendly | Mobile usability |
| SSL Labs | https://www.ssllabs.com/ssltest/ | Security audit |
| hreflang Validator | https://hreflang-validator.com/ | Regional targeting |

---

## Final Checklist Before Launch

- [ ] All tests above completed
- [ ] No critical errors
- [ ] Production base_url configured
- [ ] Analytics installed
- [ ] Backup created
- [ ] Documentation updated
- [ ] Stakeholders notified

**SEO Score Target:** 9.5/10
**Current Score:** 8.5/10 (Pre-production testing)