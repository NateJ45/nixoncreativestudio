// Foundation, edit with care.
/* ============================================================================
   cms/schema/case_studies.mjs
   ============================================================================
   The `case_studies` collection as the generic applier (scripts/cms/apply-schema.mjs)
   and `npm run cms:production-load` see it. The ONE definition of its fields lives in
   scripts/lib/case-studies-schema.mjs (the migration scripts import that file too);
   this module re-exports it in the shape the applier expects, so there is no second copy
   to drift.

   Why this file exists (CMS-DESIGN PR 13): `case_studies` was created before the
   generic applier, but PR 13 adds two fields to it (`in_hero`, `hero_order`), and the
   production loader only finds collections through cms/schema/. Against production
   today the dry run reads "unchanged field x" for the 32 existing fields and "added
   field in_hero / hero_order" for the new two (checked field by field against the live
   schema on 2026-10-03).

   Redesign 2026 adds one more optional field, `launch_status` (live, launching-soon, in-progress,
   built-not-launched; empty reads as live). Its dry run reads "added field launch_status" and the
   patches in cms/content/case_studies.json set it once; see docs/redesign-2026/content-production-plan.md.

   Two deliberate differences from the raw COLLECTION in case-studies-schema.mjs:
   - `supports` omits "seo". EmDash stores the SEO panel as the `hasSeo` flag and
     returns `supports: ["drafts","revisions","search"]`, so listing "seo" there made
     the comparison never read "unchanged" and the loader's re-check would stop. The
     CI seed adds "seo" back from `hasSeo` (cms-fixtures.mjs, seedCollection).
   - `urlPattern` is written out so the seed keeps `/work/{slug}/`.
   - `sortOrder` puts the collection in the sidebar order the design plans (PR 14); without it
     EmDash lists it last.
   ============================================================================ */
import {
  COLLECTION as BASE_COLLECTION,
  FIELDS as BASE_FIELDS,
  OBSOLETE_FIELDS as BASE_OBSOLETE,
} from '../../scripts/lib/case-studies-schema.mjs';

export const SLUG = 'case_studies';

export const COLLECTION = {
  ...BASE_COLLECTION,
  supports: BASE_COLLECTION.supports.filter((s) => s !== 'seo'),
  urlPattern: '/work/{slug}/',
  // Sidebar position (docs/CMS-DESIGN.md 4.3): after Pricing & services (10 to 12), before Journal (14).
  sortOrder: 13,
};

export const FIELDS = BASE_FIELDS;

export const OBSOLETE_FIELDS = BASE_OBSOLETE;
