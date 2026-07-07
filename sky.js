/* Outside — through a real window.
   Click: the handles turn, the sashes swing outward from the middle,
   and the camera dollies through the opening (a true perspective
   translateZ, so the reveal walls and open sashes slide past you).
   As the glass-preview sky fills the screen, the full overlay
   crossfades in — the seam is invisible because they are the same sky.
   The starfield is seeded, never random: same sky every night. */
(function () {
  "use strict";

  var win = document.querySelector(".window");
  var sky = document.getElementById("sky");
  if (!win || !sky) return;

  var sect = document.querySelector(".window-sect");
  var stage = win.querySelector(".win-stage");
  var frame = win.querySelector(".win-frame");
  var home = sky.querySelector(".sky-home");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var PERSPECTIVE = 1200;   // must match .window-sect { perspective }
  var open = false;
  var busy = false;

  /* ---------- the same sky every night ---------- */
  var s = 20260706;
  function rnd() {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  }

  (function buildStars() {
    var far = [], mid = [], bright = [], i;
    for (i = 0; i < 170; i++) {
      far.push((rnd() * 100).toFixed(2) + "vw " + (rnd() * 80).toFixed(2) + "vh 0 0 rgba(238,240,248," + (0.08 + rnd() * 0.22).toFixed(2) + ")");
    }
    for (i = 0; i < 85; i++) {
      mid.push((rnd() * 100).toFixed(2) + "vw " + (rnd() * 78).toFixed(2) + "vh 0 " + (rnd() < 0.2 ? "1px" : "0") + " rgba(244,242,236," + (0.2 + rnd() * 0.38).toFixed(2) + ")");
    }
    for (i = 0; i < 26; i++) {
      bright.push((rnd() * 100).toFixed(2) + "vw " + (rnd() * 72).toFixed(2) + "vh 1px 1px rgba(248,246,238," + (0.5 + rnd() * 0.42).toFixed(2) + ")");
    }
    var farEl = sky.querySelector(".stars-far");
    var midEl = sky.querySelector(".stars:not(.stars-far):not(.stars-tw)");
    var twEl = sky.querySelector(".stars-tw");
    if (farEl) farEl.style.boxShadow = far.join(",");
    if (midEl) midEl.style.boxShadow = mid.join(",");
    if (twEl) twEl.style.boxShadow = bright.join(",");

    /* the little piece of the same sky behind the glass */
    var wa = [], wb = [];
    for (i = 0; i < 70; i++) {
      wa.push((rnd() * 900 - 80).toFixed(0) + "px " + (rnd() * 660 - 80).toFixed(0) + "px 0 0 rgba(244,242,236," + (0.16 + rnd() * 0.42).toFixed(2) + ")");
    }
    for (i = 0; i < 24; i++) {
      wb.push((rnd() * 900 - 80).toFixed(0) + "px " + (rnd() * 620 - 80).toFixed(0) + "px 0 1px rgba(246,244,238," + (0.4 + rnd() * 0.4).toFixed(2) + ")");
    }
    var wvA = win.querySelector(".wv-a");
    var wvB = win.querySelector(".wv-b");
    if (wvA) wvA.style.boxShadow = wa.join(",");
    if (wvB) wvB.style.boxShadow = wb.join(",");
  })();

  /* ---------- through the window ---------- */
  function openSky() {
    if (open || busy) return;
    open = true;
    busy = true;
    document.body.classList.add("sky-open");     // scroll locked from the first frame
    document.body.classList.add("sky-opening");  // window rises above the page

    if (reduce) {
      sky.hidden = false;
      requestAnimationFrame(function () { sky.classList.add("open"); });
      finishOpen(260);
      return;
    }

    /* aim the camera axis through the middle of the opening */
    var o = frame.getBoundingClientRect();
    var sc = sect.getBoundingClientRect();
    sect.style.perspectiveOrigin =
      (o.left - sc.left + o.width / 2) + "px " + (o.top - sc.top + o.height / 2) + "px";

    win.classList.add("opening");   // handles turn, sashes swing (CSS)

    /* dolly: bring the opening plane almost to the camera */
    var need = (Math.max(window.innerWidth, window.innerHeight) * 2.2) / Math.max(o.width, 120);
    var tz = Math.min(PERSPECTIVE * (1 - 1 / need), PERSPECTIVE * 0.94);
    window.setTimeout(function () {
      stage.style.transform = "translateZ(" + tz + "px)";
    }, 420);

    /* crossfade to the real sky as the preview fills the screen */
    window.setTimeout(function () {
      sky.hidden = false;
      requestAnimationFrame(function () { sky.classList.add("open"); });
    }, 1150);

    finishOpen(1800);
  }

  function finishOpen(ms) {
    window.setTimeout(function () {
      sky.focus();
      /* reset the stage silently behind the opaque sky */
      win.classList.remove("opening");
      stage.style.transition = "none";
      stage.style.transform = "";
      void stage.offsetWidth;
      stage.style.transition = "";
      sect.style.perspectiveOrigin = "";
      document.body.classList.remove("sky-opening");
      busy = false;
    }, ms);
  }

  function closeSky() {
    if (!open || busy) return;
    open = false;
    busy = true;
    sky.classList.remove("open");
    window.setTimeout(function () {
      sky.hidden = true;
      document.body.classList.remove("sky-open");
      win.focus();
      busy = false;
    }, reduce ? 90 : 600);
  }

  win.addEventListener("click", openSky);
  home.addEventListener("click", function (e) { e.preventDefault(); closeSky(); });
  document.addEventListener("keydown", function (e) { if (e.key === "Escape") closeSky(); });
})();
