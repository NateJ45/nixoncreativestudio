// Safe to edit. Sector words for a study's closing line ("Building for a church?")
// and the breadcrumb trail. The closing itself is src/components/Closing.astro.

export const SECTOR_PHRASE: Record<string, string> = {
  church: 'church',
  school: 'school',
  nonprofit: 'nonprofit',
  'small-business': 'small business',
};

export const SECTOR_PLURAL: Record<string, string> = {
  church: 'Churches',
  school: 'Schools',
  nonprofit: 'Nonprofits',
  'small-business': 'Small businesses',
};
