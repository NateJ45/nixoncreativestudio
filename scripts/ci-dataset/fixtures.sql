-- Hand-written CI fixtures. Applied by rebuild.mjs right after rows.sql.
-- Everything here is rows production should NOT have to carry just so tests can
-- see them. Every statement must be idempotent (INSERT OR REPLACE / OR IGNORE).

-- The options the site needs to render at all. There is no admin user on ncs-ci,
-- so the setup wizard is marked complete here instead of being walked through.
-- (`emdash:seed_complete` and `emdash:site_id` are written by EmDash itself the
-- first time the Worker runs, so they are not set here.)
INSERT OR REPLACE INTO options (name, value) VALUES ('emdash:setup_complete', 'true');
INSERT OR REPLACE INTO options (name, value) VALUES ('site:title', '"Nixon Creative Studio"');
INSERT OR REPLACE INTO options (name, value) VALUES ('site:tagline', '"Modern websites for small businesses, nonprofits, churches, and schools. Based in Cincinnati, working with clients anywhere."');

-- Test content that exists only in CI is added below by the CMS PR that needs it
-- (docs/CMS-DESIGN.md, section 2.3), together with a line in tests/routes.ts
-- when it adds a route:
--   - PR 11 (done, but NOT here): the one `photos` entry needs a media row and an R2
--     file, so it is scripts/ci-dataset/ci-content/photos.json, merged into
--     cms-rows.sql and cms-media.json by cms-fixtures.mjs.
--   - PR 12: one published and one draft `posts` entry (journal list, a journal
--     detail route, and proof that a draft is not visible).
