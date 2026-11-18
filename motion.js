/* Quetzalitos · motion.js
   Animaciones de entrada, parallax, progreso de scroll y tilt de tarjetas. Vanilla, sin dependencias.
   No toca carrito, WhatsApp ni mapa (eso vive en app.js). */
(function () {
  'use strict';

  var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;

  // 1) Título del hero: envuelve cada palabra en <span class="w"> para la entrada escalonada.
  //    El texto se conserva; si el script no corre, el título se ve igual.
  var title = document.querySelector('.hero__title');
  if (title) {
    var i = 0;
    var wrap = function (node) {
      Array.prototype.slice.call(node.childNodes).forEach(function (child) {
        if (child.nodeType === 3) {
          var frag = document.createDocumentFragment();
          child.textContent.split(/(\s+)/).forEach(function (part) {
            if (!part) return;
            if (/^\s+$/.test(part)) { frag.appendChild(document.createTextNode(part)); return; }
            var span = document.createElement('span');
            span.className = 'w';
            span.style.setProperty('--i', i++);
            span.textContent = part;
            frag.appendChild(span);
          });
          node.replaceChild(frag, child);
        } else if (child.nodeType === 1) {
          wrap(child);
        }
      });
    };
    wrap(title);
  }

  // 2) Parallax sutil del logo al hacer scroll (pasivo, con requestAnimationFrame).
  var art = document.querySelector('.hero__art');
  if (art) {
    var ticking = false;
    var update = function () {
      var y = Math.min(window.scrollY, 700);
      art.style.setProperty('--py', (-y * 0.05).toFixed(1) + 'px');
      ticking = false;
    };
    window.addEventListener('scroll', function () {
      if (!ticking) {
        ticking = true;
        window.requestAnimationFrame(update);
      }
    }, { passive: true });
  }

  // 3) Progreso de scroll: CSS (animation-timeline) si el navegador lo soporta; si no, fallback JS.
  var bar = document.querySelector('.progress');
  var hasTimeline = window.CSS && CSS.supports && CSS.supports('animation-timeline', 'scroll()');
  if (bar && !hasTimeline) {
    var tickP = false;
    var setProgress = function () {
      var max = document.documentElement.scrollHeight - window.innerHeight;
      var p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      bar.style.setProperty('--p', p.toFixed(4));
      tickP = false;
    };
    window.addEventListener('scroll', function () {
      if (!tickP) {
        tickP = true;
        window.requestAnimationFrame(setProgress);
      }
    }, { passive: true });
    setProgress();
  }

  // 4) Tilt 3D ligero en tarjetas de producto, solo con puntero fino (escritorio).
  var fine = window.matchMedia && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  if (fine) {
    document.querySelectorAll('.product').forEach(function (card) {
      var frame = 0;
      card.addEventListener('pointermove', function (e) {
        if (frame) return;
        var x = e.clientX;
        var y = e.clientY;
        frame = window.requestAnimationFrame(function () {
          frame = 0;
          var r = card.getBoundingClientRect();
          var px = (x - r.left) / r.width - 0.5;
          var py = (y - r.top) / r.height - 0.5;
          card.style.transform = 'perspective(900px) rotateX(' + (-py * 6).toFixed(2) +
            'deg) rotateY(' + (px * 7).toFixed(2) + 'deg) translateY(-6px)';
        });
      });
      card.addEventListener('pointerleave', function () {
        if (frame) { window.cancelAnimationFrame(frame); frame = 0; }
        card.style.transform = '';
      });
    });
  }
})();
