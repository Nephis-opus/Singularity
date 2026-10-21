/**
 * Singularity Janitor Bio Studio Shim
 * The Bio Studio engine is self-contained in /static/bio-studio/
 */
(function() {
  if (typeof window.JanitorBioStudio === 'undefined') {
    const s = document.createElement('script');
    s.src = '/static/bio-studio/janitor-bio.js';
    document.head.appendChild(s);
  }
})();
