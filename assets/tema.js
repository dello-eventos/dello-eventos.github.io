// Aplica o tema (claro/noturno) antes de a página aparecer, para não piscar.
(function () {
  var t = null;
  try { t = localStorage.getItem('dello.tema'); } catch (e) { /* armazenamento bloqueado */ }
  if (t !== 'dark' && t !== 'light') t = (window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches) ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', t);
})();
