-- Site-owned: the visitor trail (src/lib/trail.ts in the browser, src/trail-endpoint.ts on the
-- Worker). One row per page view, keyed by an anonymous visitor id that lives in the visitor's
-- localStorage. When that visitor sends the contact form, the id goes with it, so the inquiry
-- email can show everything they looked at first (src/lib/visitor-profile.ts).
--
-- No IP, no name, no typed form text: the path, the page title, how long it was in view, how far
-- they scrolled, short labels for what they used, and the rough place Cloudflare saw.
-- Rows of visitors who never wrote are deleted after 13 months (the Worker's scheduled handler).
--
-- Apply it with:
--   npx wrangler d1 migrations apply nixoncreativestudio-contact --remote

CREATE TABLE IF NOT EXISTS trail_pages (
  visit_id     TEXT NOT NULL,
  page_index   INTEGER NOT NULL,
  visitor_id   TEXT NOT NULL,
  started_at   TEXT NOT NULL,
  updated_at   TEXT NOT NULL,
  path         TEXT NOT NULL,
  title        TEXT,
  -- Only on a visit's first page: where this visit came from (a lead_source label).
  visit_source TEXT,
  engaged_ms   INTEGER NOT NULL DEFAULT 0,
  scroll_pct   INTEGER NOT NULL DEFAULT 0,
  -- JSON array of short labels: "tool_use:tier_picker", "search:church website cost".
  events       TEXT,
  country      TEXT,
  region       TEXT,
  city         TEXT,
  device       TEXT,
  PRIMARY KEY (visit_id, page_index)
);

CREATE INDEX IF NOT EXISTS trail_pages_visitor ON trail_pages (visitor_id, started_at);
CREATE INDEX IF NOT EXISTS trail_pages_started ON trail_pages (started_at);

-- The trail an inquiry belongs to.
ALTER TABLE contact_submissions ADD COLUMN visitor_id TEXT;
