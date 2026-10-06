// neural notes: search palette, project filters, reveal on scroll, card light.
(function () {
  "use strict";

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

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
    var items = document.querySelectorAll("#projects .proj");
    var empty = document.getElementById("projects-empty");
    if (!buttons.length || !items.length) return;
    Array.prototype.forEach.call(buttons, function (btn) {
      btn.addEventListener("click", function () {
        var tag = btn.getAttribute("data-filter");
        var shown = 0;
        Array.prototype.forEach.call(buttons, function (b) {
          b.setAttribute("aria-pressed", b === btn ? "true" : "false");
        });
        Array.prototype.forEach.call(items, function (item) {
          var match = tag === "all" || item.getAttribute("data-tag") === tag;
          item.hidden = !match;
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
