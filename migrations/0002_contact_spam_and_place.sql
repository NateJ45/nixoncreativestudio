-- Site-owned (not generated): the spam score and the rough place and network
-- Cloudflare saw, for every inquiry. Written by src/contact-endpoint.ts; the
-- score comes from src/lib/spam-score.ts. 0001 stays the shared, generated
-- table every site in the family has.
--
-- Apply it with:
--   npx wrangler d1 migrations apply nixoncreativestudio-contact --remote

ALTER TABLE contact_submissions ADD COLUMN region TEXT;
ALTER TABLE contact_submissions ADD COLUMN city TEXT;
ALTER TABLE contact_submissions ADD COLUMN asn INTEGER;
ALTER TABLE contact_submissions ADD COLUMN as_org TEXT;
ALTER TABLE contact_submissions ADD COLUMN spam_score INTEGER;
ALTER TABLE contact_submissions ADD COLUMN spam_reasons TEXT;
-- 1 = held as likely spam: stored, never emailed. `npm run contact:held` lists them.
ALTER TABLE contact_submissions ADD COLUMN held INTEGER NOT NULL DEFAULT 0;
