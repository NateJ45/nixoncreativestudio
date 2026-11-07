/* ============================================================================
   Jobs | The /work/ index by what a site has to do
   ============================================================================
   A second way into the case studies, for someone whose exact trade is not among
   them. A study goes under a job ONLY if its case study says so, and `why` says
   what on the site does the job. These describe what the site is built to do,
   never a result: no attendance, gifts or leads are promised or implied. A job
   with no honest study comes out. tests/lean-pages.spec.ts checks the links.
   ============================================================================ */

export interface JobStudy {
  slug: string;
  why: string;
}
export interface Job {
  id: string;
  title: string;
  line: string;
  studies: JobStudy[];
}

export const JOBS: Job[] = [
  {
    id: 'calls',
    title: 'Get calls or inquiries',
    line: 'Someone who found you should know enough to pick up the phone or fill in the form.',
    studies: [
      { slug: 'reid-design', why: 'Every price and how she works, before the first call.' },
      {
        slug: 'mas-monograms',
        why: 'A quote form that asks enough, so a request arrives ready to price.',
      },
      {
        slug: 'foundation-for-reformed-theology',
        why: 'A path to an inquiry on every seminar page.',
      },
    ],
  },
  {
    id: 'sign-ups',
    title: 'Fill events and sign-ups',
    line: 'Someone deciding whether to come should find the date, the fit and the next step.',
    studies: [
      {
        slug: 'stone-steps-50k',
        why: 'Race date, fees, start times and registration on the home page.',
      },
      {
        slug: 'presbyterian-academy',
        why: 'A course finder, then a form, a free intro or a free class visit.',
      },
      {
        slug: 'theology-matters',
        why: 'Print and newsletter sign-ups that reach the supporter database.',
      },
    ],
  },
  {
    id: 'gifts',
    title: 'Take gifts or orders',
    line: 'The ask should sit where people already are, one step away.',
    studies: [
      {
        slug: 'first-presbyterian-orangeburg',
        why: 'Online giving one click from any page.',
      },
      { slug: 'theology-matters', why: 'A small Give panel between article paragraphs.' },
      {
        slug: 'mas-monograms',
        why: 'Custom work has no cart, so a customer designs a monogram and sends it as a quote.',
      },
    ],
  },
  {
    id: 'office',
    title: 'Take office work off staff',
    line: 'What someone used to chase, copy or retype by hand, the site should handle.',
    studies: [
      {
        slug: 'stone-steps-50k',
        why: 'Results, records and runner pages update themselves after each race.',
      },
      {
        slug: 'first-presbyterian-orangeburg',
        why: 'Building requests through one form, off phone and email.',
      },
      {
        slug: 'theology-matters',
        why: 'Sign-ups go straight into the database the office already uses.',
      },
    ],
  },
];
