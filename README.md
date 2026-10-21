# NorthSurvive Shopify theme

A custom Shopify Online Store 2.0 theme for [northsurvive.lt](https://northsurvive.lt).
Liquid, JSON templates, plain CSS and a small amount of vanilla JavaScript. No apps, no build step.

**Status:** Phase 3, step 1: foundation, header and footer. The homepage sections come next.
Product, collection, cart, search and blog pages are simple **temporary** versions so the
theme works end to end; Phase 4 replaces them.

---

## Everyday commands

Run these in a terminal opened inside this folder.

| What | Command |
| --- | --- |
| Preview your changes live (development theme, not your live store) | `shopify theme dev --store YOUR-STORE` |
| Check the code for errors | `shopify theme check` |
| Upload as a new **unpublished** theme | `shopify theme push --unpublished` |
| Save your work to GitHub | `git add -A` → `git commit -m "What changed"` → `git push` |

`YOUR-STORE` is the part before `.myshopify.com` in your Shopify admin address.
If the store is password protected, add `--store-password "the storefront password"`.

Never run `shopify theme push --live` or `shopify theme publish` unless you have decided to go live.

---

## How the theme is organised

```
assets/      CSS, JavaScript and font files
config/      Theme settings (colours, logo, social links) and their saved values
layout/      The HTML shell that wraps every page
locales/     All customer-facing text, in Lithuanian
sections/    The building blocks you add and edit in the theme editor
snippets/    Small reusable pieces of Liquid used inside sections
templates/   One file per page type; lists which sections appear on that page
licenses/    Font licences (not uploaded to Shopify)
```

### Files in this step

**layout/theme.liquid** — the page shell. Loads fonts, styles and scripts, then shows the
header group, the page content (`content_for_layout`) and the footer group.

**layout/password.liquid** — the shell for the "opening soon" page while the store is locked.

**snippets/theme-styles.liquid** — declares the three fonts and turns the colour settings into
CSS variables such as `--color-ink`. Fonts are split in two files each; the second (latin-ext)
loads only when a page contains Lithuanian letters, which is almost always.

**snippets/meta-tags.liquid** — page title, description, canonical URL, social sharing image,
product structured data, and Organization/WebSite structured data on the homepage. Text comes
from the SEO fields you fill in Shopify admin.

**snippets/icon.liquid** — the theme's line icons. Use it like `{% render 'icon', name: 'search' %}`.

**assets/base.css** — the design system: tokens (type scale, spacing, layout widths, radius,
motion), reset, typography, buttons, links, forms, badges and accessibility helpers. Every
section builds on these classes, so a change here changes the whole site consistently.

**assets/global.js** — the header behaviour: mega panels (click, hover, Escape, click outside),
the mobile menu, and the header that hides when scrolling down and returns when scrolling up.

**sections/ns-header.liquid + assets/section-header.css** — the header. Menu links come from
Shopify admin › Content › Menus › *Main menu*. A menu item with sub-items becomes a mega panel.

**sections/ns-footer.liquid + assets/section-footer.css** — the graphite footer. Menu columns and
the contact column are blocks you add in the theme editor. Policies come from Settings › Policies,
payment icons from your payment settings.

**sections/header-group.json, footer-group.json** — tell Shopify which sections make up the
header and footer areas, and their starting settings.

**sections/main-*.liquid + templates/*.json** — the page types. `main-page` and `main-404` are
final. The others are marked TEMPORARY and use **assets/template-basic.css**.

**templates/index.json** — the homepage. Empty for now; the homepage sections arrive next.

**templates/gift_card.liquid** — the page a customer sees from a gift card email.

**locales/lt.default.json** — every piece of interface text. To change a word on a button,
change it here, never in the section files.

**config/settings_schema.json** — the options under *Theme settings* in the editor:
brand colours, logo, favicon, sharing image, social links and motion.

---

## Rules this theme follows

- Prices, stock, variants and product text always come from Shopify, never from code.
- Interface text lives in `locales/`, links in Shopify menus, page content in the theme editor.
- Orange (Signal) is used for small accents only. Buttons are Ink.
- Every interactive element works with a keyboard and has a visible focus ring.
- Animations switch off for visitors who prefer reduced motion.

## Fonts

Inter, Inter Tight and JetBrains Mono, self-hosted as variable WOFF2 files from Fontsource.
All three are licensed under the SIL Open Font License 1.1 (see `licenses/`).
