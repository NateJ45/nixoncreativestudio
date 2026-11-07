/* The font pairings on trial. w: heading weight, b: emphasis weight, i: emphasis in italic, t: tracking, h1: headline size if the face runs wide. */
window.NCS_TYPE = [
  { key: 'geist', name: 'Geist', label: 'Geist', group: 'clean', feel: 'The one you liked. Clean, neutral and precise.', css: 'Geist:wght@400..800', display: "'Geist',sans-serif", body: "'Geist',sans-serif", w: 500, b: 700, t: '-.04em' },
  { key: 'intertight', name: 'Inter Tight', label: 'Inter Tight', group: 'clean', feel: 'The most familiar. Very tidy, and used everywhere.', css: 'Inter+Tight:wght@400..800', display: "'Inter Tight',sans-serif", body: "'Inter Tight',sans-serif", w: 500, b: 700, t: '-.04em' },
  { key: 'mona', name: 'Mona Sans', label: 'Mona Sans', group: 'clean', feel: 'GitHub’s typeface. Sturdier and a little wider, with more presence.', css: 'Mona+Sans:wght@400..800', display: "'Mona Sans',sans-serif", body: "'Mona Sans',sans-serif", w: 500, b: 700, t: '-.04em' },
  { key: 'host', name: 'Host Grotesk', label: 'Host Grotesk', group: 'clean', feel: 'Plain at first, with a little more personality in the letters.', css: 'Host+Grotesk:wght@400..800', display: "'Host Grotesk',sans-serif", body: "'Host Grotesk',sans-serif", w: 500, b: 700, t: '-.025em' },
  { key: 'schibsted', name: 'Schibsted Grotesk', label: 'Schibsted Grotesk', group: 'clean', feel: 'Made for a news publisher. Sturdy and plain-spoken.', css: 'Schibsted+Grotesk:wght@400..800', display: "'Schibsted Grotesk',sans-serif", body: "'Schibsted Grotesk',sans-serif", w: 500, b: 700, t: '-.04em' },
  { key: 'hanken', name: 'Hanken Grotesk', label: 'Hanken Grotesk', group: 'clean', feel: 'Open and quiet. The gentlest of the group.', css: 'Hanken+Grotesk:wght@400..800', display: "'Hanken Grotesk',sans-serif", body: "'Hanken Grotesk',sans-serif", w: 500, b: 700, t: '-.04em' },
  { key: 'onest', name: 'Onest', label: 'Onest', group: 'clean', feel: 'Rounder and warmer, while staying modern.', css: 'Onest:wght@400..800', display: "'Onest',sans-serif", body: "'Onest',sans-serif", w: 500, b: 700, t: '-.04em' },
  { key: 'funnel', name: 'Funnel Display', label: 'Funnel', group: 'clean', feel: 'Small cut details up close. The most character here.', css: 'Funnel+Display:wght@400..800&family=Funnel+Sans:wght@400..800', display: "'Funnel Display',sans-serif", body: "'Funnel Sans',sans-serif", w: 500, b: 700, t: '-.025em' },
  { key: 'instrument', name: 'Instrument Sans', label: 'Instrument Sans', group: 'clean', feel: 'Your current body font doing the headlines too. The simplest system.', css: 'Instrument+Sans:wght@400..800', display: "'Instrument Sans',sans-serif", body: "'Instrument Sans',sans-serif", w: 500, b: 700, t: '-.04em' },
  { key: 'current', label: 'Bricolage', name: 'Bricolage + Instrument Sans', feel: 'Today. Modern with a little character.' },
  { key: 'editorial', label: 'Editorial', name: 'Instrument Serif + Instrument Sans', feel: 'A magazine. Calm, grown up, the emphasis turns italic.', css: 'Instrument+Serif:ital@0;1', display: "'Instrument Serif',serif", w: 400, b: 400, i: 1, t: '-.02em', h1: 'clamp(3.1rem,7.2vw,7.5rem)' },
  { key: 'fraunces', label: 'Soft serif', name: 'Fraunces + Figtree', feel: 'Warm and soft. A serif with some wobble.', css: 'Fraunces:ital,opsz,wght@0,9..144,300..800;1,9..144,300..800&family=Figtree:wght@400;500;600', display: "'Fraunces',serif", body: "'Figtree',sans-serif", w: 400, b: 600, i: 1, t: '-.03em' },
  { key: 'gloock', label: 'Poster', name: 'Gloock + Instrument Sans', feel: 'A poster. Heavy old-style print with real presence.', css: 'Gloock', display: "'Gloock',serif", w: 400, b: 400, t: '-.01em', h1: 'clamp(2.6rem,5.9vw,6rem)' },
  { key: 'bodoni', label: 'Fashion', name: 'Bodoni Moda + Jost', feel: 'Fashion. High contrast and a bit glamorous.', css: 'Bodoni+Moda:ital,opsz,wght@0,6..96,400..800;1,6..96,400..800&family=Jost:wght@400;500;600', display: "'Bodoni Moda',serif", body: "'Jost',sans-serif", w: 500, b: 500, i: 1, t: '-.025em', extra: "blockquote,.price strong,.price h3,.cap b,.mark{font-optical-sizing:none;font-variation-settings:'opsz' 11}" },
  { key: 'syne', label: 'Art school', name: 'Syne + Manrope', feel: 'Art school. Wide, odd and confident.', css: 'Syne:wght@400..800&family=Manrope:wght@400;500;600', display: "'Syne',sans-serif", body: "'Manrope',sans-serif", w: 600, b: 800, t: '-.035em', h1: 'clamp(2.4rem,5.3vw,5.4rem)' },
  { key: 'unbounded', label: 'Tech', name: 'Unbounded + DM Sans', feel: 'Tech. Round and futuristic, the most hyper modern.', css: 'Unbounded:wght@300..800&family=DM+Sans:opsz,wght@9..40,400..600', display: "'Unbounded',sans-serif", body: "'DM Sans',sans-serif", w: 400, b: 700, t: '-.045em', h1: 'clamp(2.1rem,4.6vw,4.7rem)' },
];
window.NCS_TYPE_APPLY = function (key) {
  var o = window.NCS_TYPE.find(function (x) { return x.key === key; });
  if (!o || !o.display) return;
  var link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://fonts.googleapis.com/css2?family=' + o.css + '&display=swap';
  document.head.appendChild(link);
  var css = ':root{--display:' + o.display + (o.body ? ';--body:' + o.body : '') + '}' +
    'h1,h2,h3,.end h2,.mark,.cap b,.price h3,.price strong,blockquote,.sheet .hook{font-weight:' + o.w + ';letter-spacing:' + o.t + '}' +
    'h1 b,.end h2 b{font-weight:' + o.b + ';font-style:' + (o.i ? 'italic' : 'normal') + '}';
  if (o.h1) css += 'h1{font-size:' + o.h1 + '}.end h2{font-size:' + o.h1 + '}';
  if (o.extra) css += o.extra;
  var style = document.createElement('style');
  style.textContent = css;
  document.head.appendChild(style);
};
