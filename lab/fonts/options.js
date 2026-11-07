/* The font pairings on trial. w: heading weight, b: emphasis weight, i: emphasis in italic, t: tracking, h1: headline size if the face runs wide. */
window.NCS_TYPE = [
  { key: 'current', name: 'Bricolage + Instrument Sans', feel: 'Today. Modern with a little character.' },
  { key: 'editorial', name: 'Instrument Serif + Instrument Sans', feel: 'A magazine. Calm, grown up, the emphasis turns italic.', css: 'Instrument+Serif:ital@0;1', display: "'Instrument Serif',serif", w: 400, b: 400, i: 1, t: '-.02em', h1: 'clamp(3.1rem,7.2vw,7.5rem)' },
  { key: 'fraunces', name: 'Fraunces + Figtree', feel: 'Warm and soft. A serif with some wobble.', css: 'Fraunces:ital,opsz,wght@0,9..144,300..800;1,9..144,300..800&family=Figtree:wght@400;500;600', display: "'Fraunces',serif", body: "'Figtree',sans-serif", w: 400, b: 600, i: 1, t: '-.03em' },
  { key: 'gloock', name: 'Gloock + Instrument Sans', feel: 'A poster. Heavy old-style print with real presence.', css: 'Gloock', display: "'Gloock',serif", w: 400, b: 400, t: '-.01em', h1: 'clamp(2.6rem,5.9vw,6rem)' },
  { key: 'bodoni', name: 'Bodoni Moda + Jost', feel: 'Fashion. High contrast and a bit glamorous.', css: 'Bodoni+Moda:ital,opsz,wght@0,6..96,400..800;1,6..96,400..800&family=Jost:wght@400;500;600', display: "'Bodoni Moda',serif", body: "'Jost',sans-serif", w: 500, b: 500, i: 1, t: '-.025em', extra: "blockquote,.price strong,.price h3,.cap b,.mark{font-optical-sizing:none;font-variation-settings:'opsz' 11}" },
  { key: 'syne', name: 'Syne + Manrope', feel: 'Art school. Wide, odd and confident.', css: 'Syne:wght@400..800&family=Manrope:wght@400;500;600', display: "'Syne',sans-serif", body: "'Manrope',sans-serif", w: 600, b: 800, t: '-.035em', h1: 'clamp(2.4rem,5.3vw,5.4rem)' },
  { key: 'unbounded', name: 'Unbounded + DM Sans', feel: 'Tech. Round and futuristic, the most hyper modern.', css: 'Unbounded:wght@300..800&family=DM+Sans:opsz,wght@9..40,400..600', display: "'Unbounded',sans-serif", body: "'DM Sans',sans-serif", w: 400, b: 700, t: '-.045em', h1: 'clamp(2.1rem,4.6vw,4.7rem)' },
  { key: 'geist', name: 'Geist', feel: 'Software. Clean, neutral and precise.', css: 'Geist:wght@400..800', display: "'Geist',sans-serif", body: "'Geist',sans-serif", w: 500, b: 700, t: '-.045em' },
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
