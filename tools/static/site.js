/*
 * site.js — comportements des pages statiques qui n'avaient pas de code dans le canvas :
 *   - « Copier l'adresse » copie l'e-mail du lien mailto voisin ;
 *   - un bouton qui contient une image (couvertures des documents) l'affiche en grand.
 */
(function () {
  'use strict';

  var en = (document.documentElement.lang || '').toLowerCase().indexOf('en') === 0;
  var L = en
    ? { copied: 'Address copied', failed: 'Copy failed', close: 'Close' }
    : { copied: 'Adresse copiée', failed: 'Copie impossible', close: 'Fermer' };

  function lastText(el) {
    for (var n = el.lastChild; n; n = n.previousSibling) if (n.nodeType === 3 && n.data.trim()) return n;
    return null;
  }

  function setupCopy(btn) {
    var scope = btn.closest('section') || document.body;
    var link = scope.querySelector('a[href^="mailto:"]');
    if (!link) return;
    var email = link.getAttribute('href').replace(/^mailto:/, '').split('?')[0];
    var label = lastText(btn);
    var original = label ? label.data : '';
    var timer = 0;
    btn.addEventListener('click', function () {
      var done = function (msg) {
        if (!label) return;
        label.data = msg;
        clearTimeout(timer);
        timer = setTimeout(function () { label.data = original; }, 2000);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(email).then(function () { done(L.copied); }, function () { done(L.failed); });
      } else {
        done(L.failed);
      }
    });
  }

  // « Agrandir la couverture du mémoire de Master » → « Mémoire de Master »
  function documentName(label) {
    var name = (label || '').replace(/^(agrandir|enlarge)\s+(la couverture (du |de la |des )|the cover of the |le |la |the )?/i, '');
    return name.charAt(0).toUpperCase() + name.slice(1);
  }

  var dialog = null;
  function openImage(src, label) {
    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.setAttribute('style', 'max-width: min(92vw, 900px); max-height: 92vh; padding: 0; border: 1.5px solid #111412; background: #F2F2EE; box-shadow: 14px 14px 0 #FCCA21; overflow: auto');
      dialog.innerHTML =
        '<form method="dialog" style="position: sticky; top: 0; display: flex; justify-content: flex-end; background: #F2F2EE; border-bottom: 1px solid #D5D7D1">' +
        '<button style="min-height: 44px; padding: 0 18px; border: 0; background: #111412; color: #F2F2EE; font: 600 14px Archivo, Arial, sans-serif; cursor: pointer"></button></form>' +
        '<img alt="" style="display: block; width: 100%; height: auto">';
      dialog.querySelector('button').textContent = L.close;
      dialog.addEventListener('click', function (e) { if (e.target === dialog) dialog.close(); });
      var style = document.createElement('style');
      style.textContent = 'dialog::backdrop{background:rgba(17,20,18,.82)}';
      document.head.appendChild(style);
      document.body.appendChild(dialog);
    }
    var img = dialog.querySelector('img');
    img.src = src;
    img.alt = label || '';
    dialog.setAttribute('aria-label', label || '');
    if (typeof dialog.showModal === 'function') dialog.showModal();
    else window.open(src, '_blank', 'noopener');
  }

  var buttons = document.querySelectorAll('button');
  for (var i = 0; i < buttons.length; i++) {
    var btn = buttons[i];
    if (btn.closest('#dc-root')) continue;
    var img = btn.querySelector('img');
    if (img) {
      btn.addEventListener('click', (function (b, im) {
        return function () { openImage(im.currentSrc || im.src, documentName(b.getAttribute('aria-label'))); };
      })(btn, img));
    } else if (/copier|copy/i.test(btn.textContent)) {
      setupCopy(btn);
    }
  }
})();
