/* Font trial for the homepage. Only acts when the address has ?type=<option>. Options are listed in /fonts/options.js. */
(function () {
  var key = new URLSearchParams(location.search).get('type');
  if (!key) return;
  document.write('<script src="/fonts/options.js"><\/script>');
  document.write('<script>window.NCS_TYPE_APPLY&&window.NCS_TYPE_APPLY(' + JSON.stringify(key) + ')<\/script>');
})();
