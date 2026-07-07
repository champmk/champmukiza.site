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
  var mainEl = document.querySelector("main");
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  var EASE = "cubic-bezier(0.5, 0.04, 0.16, 1)";
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

    /* the travel: the whole page moves toward the opening (so the room
       slides past you), plus a real translateZ inside the scene so the
       reveal walls and open sashes diverge with true parallax */
    var mr = mainEl.getBoundingClientRect();
    var k = Math.max(window.innerWidth / Math.max(o.width, 120),
                     window.innerHeight / Math.max(o.height, 120)) * 1.3;
    mainEl.style.transformOrigin =
      (o.left - mr.left + o.width / 2) + "px " + (o.top - mr.top + o.height / 2) + "px";
    mainEl.style.transition = "transform 1.15s " + EASE;
    window.setTimeout(function () {
      mainEl.style.transform = "scale(" + k + ")";
      stage.style.transform = "translateZ(190px)";
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
      /* reset the room silently behind the opaque sky */
      win.classList.remove("opening");
      stage.style.transition = "none";
      stage.style.transform = "";
      mainEl.style.transition = "none";
      mainEl.style.transform = "";
      void stage.offsetWidth;
      stage.style.transition = "";
      mainEl.style.transition = "";
      mainEl.style.transformOrigin = "";
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
