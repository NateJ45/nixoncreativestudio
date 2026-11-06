// Real facts only. Each direction may load this with <script src="../shared.js"></script> and read window.NCS.
window.NCS = {
  line: { lead: 'I build websites that', heavy: 'pull their weight.' },
  sub: 'Websites for churches, schools, nonprofits and small businesses, from $4,000. One person in Cincinnati does the design, the build and, when needed, the photos.',
  contact: { email: 'nathan@nixoncreativestudio.com', phone: '(256) 318-6627', place: 'Cincinnati, OH', reply: 'I read it myself and reply within one or two business days.', free: 'The first conversation is free and ends with an honest ballpark.' },
  links: { work: 'https://nixoncreativestudio.com/work/', services: 'https://nixoncreativestudio.com/services/', about: 'https://nixoncreativestudio.com/about/', contact: 'https://nixoncreativestudio.com/contact/' },
  tiers: [
    { name: 'Launch', from: '$4,000', who: 'Smaller organizations' },
    { name: 'Signature', from: '$7,000', who: 'Most projects' },
    { name: 'Flagship', from: '$12,000', who: 'Advanced builds' },
  ],
  quote: { text: "Nathan Nixon transformed our website from a slow, clunky station wagon to a fast, beautiful sports car. Without compromising the integrity of our message, he's made it more attractive. Exceedingly competent and easy to work with, he has helped enormously to advance our mission.", by: 'Richard E. Burnett, Ph.D.', role: 'Executive Director and Managing Editor, Theology Matters' },
  sites: [
    { slug: 'stone-steps-50k', name: 'Stone Steps 50K', sector: 'Nonprofit', hook: 'Records calculated from every finish since 2003', paper: '#FBF6EA', accent: '#A83C26', host: 'stonesteps50k.com' },
    { slug: 'mas-monograms', name: 'MAS Monograms', sector: 'Small business', hook: 'Try your own initials right in the hero', paper: '#F4EEE3', accent: '#28486B', host: 'mas-monograms.com' },
    { slug: 'presbyterian-academy', name: 'The Presbyterian Academy', sector: 'School', hook: 'A term catalog, laid out like one', paper: '#FAF8F4', accent: '#33503F', host: 'presbyterianacademy.org' },
    { slug: 'theology-matters', name: 'Theology Matters', sector: 'Nonprofit', hook: 'Every issue since 1995, online, searchable and read aloud', paper: '#F6F1E7', accent: '#7A1F2B', host: 'theologymatters.com' },
    { slug: 'first-baptist-muncie', name: 'First Baptist Church Muncie', sector: 'Church', hook: 'A first Sunday laid out in order, from the front door to worship', paper: '#F4EFE6', accent: '#292854', host: 'fbcmuncie.org' },
    { slug: 'reid-design', name: 'Reid Design', sector: 'Small business', hook: 'The plan and the price before anything is ordered', paper: '#F7F3EE', accent: '#80604F', host: 'reiddesignllc.com' },
    { slug: 'foundation-for-reformed-theology', name: 'Foundation for Reformed Theology', sector: 'Nonprofit', hook: 'A library you can search down to the full text', paper: '#F7F3EC', accent: '#1C2B4A', host: 'foundationrt.org' },
    { slug: 'first-presbyterian-orangeburg', name: 'First Presbyterian Church of Orangeburg', sector: 'Church', hook: 'Book the building through one form, not an inbox', paper: '#FFFFFF', accent: '#45050C', host: '1stpresbyterian.org' },
  ],
};
window.NCS.sites.forEach((s) => { s.video = '/assets/' + s.slug + '.mp4'; s.poster = '/assets/' + s.slug + '.webp'; s.study = 'https://nixoncreativestudio.com/work/' + s.slug + '/'; });
