# Default Open Graph image — needs to be created

Drop a `og-default.png` (1200×630) in this directory. It's referenced by
`BaseLayout.astro` as the fallback image for every page that doesn't pass
its own `ogImage` prop (e.g. /, /about, /services, /contact).

Recommended content:
- The studio wordmark on a navy background
- A short tagline, e.g. "Modern websites for the Cincinnati region"
- Generous padding (60px+); platforms crop the edges aggressively

Until this file exists, social shares of the home/about/services/contact
pages will show a broken-image preview. Case studies are fine — they
pass their cover image to `ogImage`.

Tools that produce 1200×630 PNGs easily:
- Figma / Canva / Photoshop
- https://www.opengraph.xyz/ (browser-based generator)
- `npx @vercel/og` if you ever script it from CI
