/* /one-page: the print button. It needs this script, so without JavaScript the CSS takes it away. */
document.querySelector('[data-print]').addEventListener('click', function () {
  window.print();
});
