// Safe to edit.
/* ============================================================================
   gbp-shots.config.mjs: per-site choices for the Google Business Profile shots
   ============================================================================
   The site list comes from the liveUrl of each case study in src/content/case-studies. This file only
   says how each site should look in the renders. Every key is optional.

     bg        Backdrop colour for that site's renders. Pick a colour from the
               site's own brand so the photo grid reads as many studios' worth
               of colour, not one grey wall. Falls back to the captured
               theme-color, then to #0a1628 (the studio navy).
     sections  Which captured sections (raw/{slug}/desktop-sec-NN.png) are
               worth showing, best first. Look at the raw folder after a
               capture and list the strongest ones. Default: the first two.
     phone     Which phone captures go in the three-phone shot, in order.
               Default: hero plus the first two phone sections.
     pages     Extra pages worth a shot of their own, e.g. a records table
               or a product configurator: [{ path: '/records/', name: 'records' }].
     skip      true to leave a case study out of the shots.
     hide      Extra CSS selectors to hide while shooting (popups the generic
               cookie / donate / back-to-top rules miss).
     motion    true to shoot with motion on (for heroes that only look right
               mid-animation). Default: reduced motion, so reveals have settled.
   ============================================================================ */

export default {
  'stone-steps-50k': { bg: '#2d5a2f', sections: [3, 2, 6, 1], phone: ['hero', 'sec-03', 'sec-06'] },
  'mas-monograms': { bg: '#b98a52', sections: [1, 2, 5], phone: ['hero', 'sec-01', 'sec-02'] },
  'presbyterian-academy': {
    bg: '#24402f',
    sections: [2, 1, 3],
    phone: ['hero', 'sec-02', 'sec-03'],
  },
  'theology-matters': { bg: '#7a1f26', sections: [5, 1, 3], phone: ['hero', 'sec-01', 'sec-05'] },
  'reid-design': { bg: '#7d5a47', sections: [3, 2, 5], phone: ['hero', 'sec-01', 'sec-03'] },
  'foundation-for-reformed-theology': {
    bg: '#6e1f24',
    sections: [1, 2],
    phone: ['hero', 'sec-01', 'sec-02'],
  },
  'first-baptist-muncie': {
    bg: '#2a2660',
    sections: [1, 2, 3],
    phone: ['hero', 'sec-01', 'sec-02'],
  },
  'west-chester-preschool': {
    bg: '#0b4a8f',
    sections: [2, 4, 3],
    phone: ['hero', 'sec-02', 'sec-04'],
    // With reduced motion on, the live site's script hangs and the page never
    // finishes loading, so shoot it with motion on.
    motion: true,
  },
  // Left out of the first batch: its homepage photographs less strongly than
  // the others. Delete this line to include it.
  'first-presbyterian-orangeburg': { skip: true },
};
