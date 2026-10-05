// neural notes: background field, search palette, project filters, reveal on scroll.
(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- background dot field ---------- */
  (function field() {
    var canvas = document.getElementById("field");
    if (!canvas || !canvas.getContext) return;
    var ctx = canvas.getContext("2d");
    var GAP = 26;
    var w = 0, h = 0, cols = 0, rows = 0, dpr = 1;
    var mouse = { x: -9999, y: -9999 };
    var signals = [];
    var running = false;
    var last = 0;
    var nextSignal = 0;

    function resize() {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      w = window.innerWidth;
      h = window.innerHeight;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      cols = Math.ceil(w / GAP) + 1;
      rows = Math.ceil(h / GAP) + 1;
      draw(performance.now());
    }

    // A signal is a short path that hops between neighbouring dots.
    function spawn(now) {
      var c = Math.floor(Math.random() * cols);
      var r = Math.floor(Math.random() * Math.max(1, rows * 0.7));
      var path = [[c, r]];
      var len = 5 + Math.floor(Math.random() * 7);
      var dir = Math.random() < 0.5 ? 1 : -1;
      for (var i = 0; i < len; i++) {
        var step = Math.random();
        if (step < 0.55) c += dir;
        else if (step < 0.8) r += 1;
        else r -= 1;
        path.push([c, r]);
      }
      signals.push({ path: path, start: now, dur: len * 110 });
    }

    function draw(now) {
      ctx.clearRect(0, 0, w, h);
      var R = 150;
      for (var r = 0; r < rows; r++) {
        for (var c = 0; c < cols; c++) {
          var x = c * GAP, y = r * GAP;
          var dx = x - mouse.x, dy = y - mouse.y;
          var d2 = dx * dx + dy * dy;
          if (d2 < R * R) {
            var k = 1 - Math.sqrt(d2) / R;
            ctx.fillStyle = "rgba(" + Math.round(120 + 90 * (1 - k)) + "," + Math.round(185 + 45 * (1 - k)) + ",255," + (0.16 + k * 0.75) + ")";
            ctx.beginPath();
            ctx.arc(x, y, 1 + k * 1.3, 0, 6.2832);
            ctx.fill();
          } else {
            ctx.fillStyle = "rgba(180,210,255,0.2)";
            ctx.fillRect(x - 0.6, y - 0.6, 1.2, 1.2);
          }
        }
      }
      for (var s = signals.length - 1; s >= 0; s--) {
        var sig = signals[s];
        var t = (now - sig.start) / sig.dur;
        if (t > 1.6) { signals.splice(s, 1); continue; }
        var head = t * (sig.path.length - 1);
        for (var i = 0; i < sig.path.length; i++) {
          var age = head - i;
          if (age < 0 || age > 4) continue;
          var a = 1 - age / 4;
          var px = sig.path[i][0] * GAP, py = sig.path[i][1] * GAP;
          if (i > 0 && age < 3) {
            ctx.strokeStyle = "rgba(77,163,255," + a * 0.55 + ")";
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(sig.path[i - 1][0] * GAP, sig.path[i - 1][1] * GAP);
            ctx.lineTo(px, py);
            ctx.stroke();
          }
          ctx.fillStyle = "rgba(160,210,255," + a + ")";
          ctx.beginPath();
          ctx.arc(px, py, 1.2 + a * 1.4, 0, 6.2832);
          ctx.fill();
        }
      }
    }

    function frame(now) {
      if (!running) return;
      if (now - last > 33) {
        if (now > nextSignal) {
          spawn(now);
          nextSignal = now + 500 + Math.random() * 900;
        }
        draw(now);
        last = now;
      }
      requestAnimationFrame(frame);
    }

    function start() {
      if (reduce || running || document.hidden) return;
      running = true;
      requestAnimationFrame(frame);
    }

    window.addEventListener("resize", resize);
    window.addEventListener("pointermove", function (e) {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
    }, { passive: true });
    document.addEventListener("pointerleave", function () { mouse.x = mouse.y = -9999; });
    document.addEventListener("visibilitychange", function () {
      if (document.hidden) running = false;
      else start();
    });
    resize();
    start();
  })();

  /* ---------- reveal on load and scroll ---------- */
  (function reveal() {
    var els = Array.prototype.slice.call(document.querySelectorAll(".reveal"));
    if (!els.length) return;
    if (reduce || !("IntersectionObserver" in window)) {
      els.forEach(function (el) { el.classList.add("in"); });
      return;
    }
    var hero = document.querySelector(".hero");
    if (hero) {
      Array.prototype.forEach.call(hero.querySelectorAll(".reveal"), function (el, i) {
        el.style.setProperty("--i", i);
      });
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) {
          en.target.classList.add("in");
          io.unobserve(en.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px" });
    els.forEach(function (el) { io.observe(el); });
  })();

  /* ---------- glow that follows the pointer on cards ---------- */
  Array.prototype.forEach.call(document.querySelectorAll(".card"), function (card) {
    card.addEventListener("pointermove", function (e) {
      var r = card.getBoundingClientRect();
      card.style.setProperty("--mx", e.clientX - r.left + "px");
      card.style.setProperty("--my", e.clientY - r.top + "px");
    });
    card.addEventListener("pointerleave", function () {
      card.style.removeProperty("--mx");
      card.style.removeProperty("--my");
    });
  });

  /* ---------- project filters ---------- */
  (function filters() {
    var buttons = document.querySelectorAll("[data-filter]");
    var rows = document.querySelectorAll("#rows .row");
    var empty = document.getElementById("rows-empty");
    if (!buttons.length || !rows.length) return;
    Array.prototype.forEach.call(buttons, function (btn) {
      btn.addEventListener("click", function () {
        var tag = btn.getAttribute("data-filter");
        var shown = 0;
        Array.prototype.forEach.call(buttons, function (b) {
          b.setAttribute("aria-pressed", b === btn ? "true" : "false");
        });
        Array.prototype.forEach.call(rows, function (row) {
          var match = tag === "all" || row.getAttribute("data-tag") === tag;
          row.hidden = !match;
          if (match) shown++;
        });
        if (empty) empty.hidden = shown > 0;
      });
    });
  })();

  /* ---------- search palette ---------- */
  (function palette() {
    var dialog = document.getElementById("palette");
    var input = document.getElementById("palette-input");
    var list = document.getElementById("palette-list");
    var empty = document.getElementById("palette-empty");
    var items = window.SITE_INDEX || [];
    if (!dialog || !input || !list || typeof dialog.showModal !== "function") return;
    var selected = 0;
    var results = [];

    function render() {
      var q = input.value.trim().toLowerCase();
      results = items.filter(function (it) {
        return !q || it.t.toLowerCase().indexOf(q) !== -1 || it.k.indexOf(q) !== -1;
      });
      if (selected >= results.length) selected = 0;
      list.innerHTML = "";
      results.forEach(function (it, i) {
        var li = document.createElement("li");
        li.setAttribute("role", "option");
        li.setAttribute("aria-selected", i === selected ? "true" : "false");
        var a = document.createElement("a");
        a.href = it.u;
        a.textContent = it.t;
        var kind = document.createElement("span");
        kind.textContent = it.k;
        a.appendChild(kind);
        a.addEventListener("click", function () { dialog.close(); });
        li.appendChild(a);
        list.appendChild(li);
      });
      empty.hidden = results.length > 0;
    }

    function open() {
      if (dialog.open) return;
      input.value = "";
      selected = 0;
      render();
      dialog.showModal();
      input.focus();
    }

    Array.prototype.forEach.call(document.querySelectorAll("[data-open-palette]"), function (btn) {
      btn.addEventListener("click", open);
    });

    document.addEventListener("keydown", function (e) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (dialog.open) dialog.close();
        else open();
      }
    });

    input.addEventListener("input", function () { selected = 0; render(); });

    input.addEventListener("keydown", function (e) {
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        if (!results.length) return;
        selected = (selected + (e.key === "ArrowDown" ? 1 : -1) + results.length) % results.length;
        render();
        var cur = list.querySelector('[aria-selected="true"]');
        if (cur) cur.scrollIntoView({ block: "nearest" });
      } else if (e.key === "Enter" && results[selected]) {
        e.preventDefault();
        window.location.href = results[selected].u;
      }
    });

    // Click on the dimmed area closes the palette.
    dialog.addEventListener("click", function (e) {
      if (e.target === dialog) dialog.close();
    });
  })();
})();
