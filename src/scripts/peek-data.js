/* The one fetch behind the link previews (peek.js) and the command palette (palette.js): /peek.json,
   written at build time by src/pages/peek.json.ts. It is asked for the first time either of them is
   used and kept for the rest of the page, so no page pays for it at load. A failed fetch gives null
   and is tried again next time. */
var asked = null;

export function peekData() {
  if (!asked) {
    asked = fetch('/peek.json')
      .then(function (r) {
        if (!r.ok) throw new Error('peek.json ' + r.status);
        return r.json();
      })
      .catch(function () {
        asked = null;
        return null;
      });
  }
  return asked;
}
