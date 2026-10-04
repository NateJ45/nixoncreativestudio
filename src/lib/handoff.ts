/* ============================================================================
   handoff | what every site is handed over with
   ============================================================================
   Safe to edit.

   The five promises the studio makes about launch day. Shown on /services (the
   "What you get at handoff" ink band) and on the church and nonprofit landing
   pages (the same band), so the wording can never differ between them. Each
   line restates something already promised elsewhere (the Home hero, the Web
   design offering, the Care plan note); keep them in step.

   Written in code because no CMS field holds it yet (docs/EDITING-GUIDE.md,
   "What stays in code").
   ============================================================================ */

export interface HandoffItem {
  title: string;
  body: string;
}

export const HANDOFF: HandoffItem[] = [
  {
    title: 'An editor your team can use',
    body: 'Staff or volunteers change pages, photos and events themselves, without a developer.',
  },
  {
    title: 'A written guide',
    body: 'The everyday edits, written down for whoever runs the site next.',
  },
  {
    title: 'Backups that are checked',
    body: 'The site and its content are backed up automatically, and I check that the backups work.',
  },
  {
    title: 'Accessibility checks',
    body: 'Tested against WCAG AA before launch, on every change.',
  },
  {
    title: 'Yours outright',
    body: 'No lock-in. The custom-coded builds cost little or nothing a month to host.',
  },
];
