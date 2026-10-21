/**
 * Singularity S-Connect Shim
 * The S-Connect engine is self-contained in /static/s-connect/
 */
(function() {
  if (typeof window.SConnect === 'undefined') {
    const s = document.createElement('script');
    s.src = '/static/s-connect/connect-panel.js';
    document.head.appendChild(s);
  }
})();
