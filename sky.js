/* Outside.
   Click the window and you lean through it: the sky overlay's clip-path
   starts as the exact rectangle of the glass and grows to fill the room.
   Day outside: five clouds. Night: five bright stars. Esc comes home.
   The starfield is seeded, not random — it's the same sky every night. */
(function () {
  "use strict";

  var win = document.querySelector(".window");
  var sky = document.getElementById("sky");
  if (!win || !sky) return;

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var glass = win.querySelector(".w-glass");
  var home = sky.querySelector(".sky-home");
  var open = false;
  var closing = null;

  /* ---------- the same sky every night (seeded, never Math.random) ---------- */
  var base = sky.querySelector(".stars:not(.stars-tw)");
  var tw = sky.querySelector(".stars-tw");
  if (base && tw) {
    var s = 20260706;
    var rnd = function () {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      return s / 4294967296;
    };
    var quiet = [], twinkling = [];
    for (var i = 0; i < 120; i++) {
      var star = (rnd() * 100).toFixed(2) + "vw " +
                 (rnd() * 78).toFixed(2) + "vh 0 " +
                 (rnd() < 0.16 ? "1px " : "0 ") +
                 "rgba(244,242,236," + (0.14 + rnd() * 0.5).toFixed(2) + ")";
      (i % 4 === 0 ? twinkling : quiet).push(star);
    }
    base.style.boxShadow = quiet.join(",");
    tw.style.boxShadow = twinkling.join(",");
  }

  /* ---------- the pane, as a clip rectangle ---------- */
  function paneClip() {
    var r = glass.getBoundingClientRect();
    return "inset(" + Math.max(0, r.top) + "px " +
      Math.max(0, window.innerWidth - r.right) + "px " +
      Math.max(0, window.innerHeight - r.bottom) + "px " +
      Math.max(0, r.left) + "px round 3px)";
  }

  function openSky() {
    if (open) return;
    open = true;
    clearTimeout(closing);
    sky.hidden = false;
    document.body.classList.add("sky-open");

    if (reduce) {
      sky.style.clipPath = "none";
      sky.classList.add("open");
      sky.focus();
      return;
    }
    sky.style.transition = "none";
    sky.style.clipPath = paneClip();
    var settled = false;
    var toOpen = function () {
      if (settled || !open) return;
      settled = true;
      sky.style.transition = "";
      sky.classList.add("open");
      sky.style.clipPath = "inset(0px 0px 0px 0px round 0px)";
    };
    requestAnimationFrame(function () {
      requestAnimationFrame(toOpen);
    });
    window.setTimeout(toOpen, 120);   // belt-and-suspenders if a frame is dropped
    window.setTimeout(function () { sky.focus(); }, 870);
  }

  function closeSky() {
    if (!open) return;
    open = false;

    function done() {
      sky.hidden = true;
      sky.classList.remove("open");
      sky.style.clipPath = "";
      document.body.classList.remove("sky-open");
      win.focus();
    }

    if (reduce) { done(); return; }
    sky.classList.remove("open");
    sky.style.clipPath = paneClip();
    closing = window.setTimeout(done, 880);
  }

  win.addEventListener("click", openSky);
  home.addEventListener("click", function (e) { e.preventDefault(); closeSky(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeSky(); });
})();
