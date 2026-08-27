/* CHAMP.MK intro — the room is dark; the lamp flickers on and its light
   pools outward until the whole page is lit. Once per session; skippable;
   respects reduced-motion. The overlay's hole (--mx/--my/--r) is driven here. */
(function () {
  "use strict";

  var intro = document.getElementById("intro");
  if (!intro) return;

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var seen = false;
  try { seen = sessionStorage.getItem("champ-intro") === "1"; } catch (e) {}

  if (reduce || seen) {
    intro.classList.add("done");
    document.body.classList.add("revealed");
    return;
  }
  try { sessionStorage.setItem("champ-intro", "1"); } catch (e) {}

  var lamp = document.querySelector(".lamp");

  /* Timeline (ms) */
  var T_FLICK = 420;   // the lamp stutters on
  var T_POOL  = 1000;  // light pools over the wordmark
  var D_POOL  = 650;
  var T_FLOOD = 1800;  // light floods the whole room
  var D_FLOOD = 600;
  var T_END   = 2500;

  var timers = [];
  var raf = 0;
  var finished = false;

  function bulbPoint() {
    var glow = lamp && lamp.querySelector(".l-glow");
    if (!glow) return { x: innerWidth / 2, y: innerHeight * 0.42 };
    var r = glow.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  function setPool(px) { intro.style.setProperty("--r", px + "px"); }

  function animateR(from, to, dur, ease) {
    cancelAnimationFrame(raf);
    var t0 = performance.now();
    function step(now) {
      var t = Math.min(1, (now - t0) / dur);
      setPool(from + (to - from) * ease(t));
      if (t < 1) raf = requestAnimationFrame(step);
    }
    raf = requestAnimationFrame(step);
  }

  function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }

  function finish() {
    if (finished) return;
    finished = true;
    timers.forEach(clearTimeout);
    cancelAnimationFrame(raf);
    if (lamp) lamp.classList.remove("flicker");
    intro.classList.add("done");
    document.body.classList.remove("intro-active", "intro-lit");
    document.body.classList.add("revealed");
    window.removeEventListener("wheel", onSkip);
    window.removeEventListener("touchstart", onSkip);
    window.removeEventListener("keydown", onSkip);
    window.removeEventListener("pointerdown", onSkip);
  }

  function onSkip(e) {
    if (e && e.type === "keydown" && (e.key === "Tab" || e.key === "Shift")) return;
    finish();
  }

  function start() {
    document.body.classList.add("intro-active");

    var p = bulbPoint();
    intro.style.setProperty("--mx", p.x + "px");
    intro.style.setProperty("--my", p.y + "px");
    setPool(0);

    // 1 — darkness, then the lamp stutters on
    timers.push(setTimeout(function () {
      document.body.classList.add("intro-lit");
      if (lamp) lamp.classList.add("flicker");
      timers.push(setTimeout(function () { if (lamp) lamp.classList.remove("flicker"); }, 640));
    }, T_FLICK));

    // 2 — light pools onto the wordmark beneath the shade
    timers.push(setTimeout(function () {
      var pool = Math.max(innerWidth * 0.34, 320);
      animateR(0, pool, D_POOL, easeOutCubic);
    }, T_POOL));

    // 3 — the light finds the rest of the room
    timers.push(setTimeout(function () {
      var flood = Math.max(innerWidth, innerHeight) * 1.7;
      var from = Math.max(innerWidth * 0.34, 320);
      animateR(from, flood, D_FLOOD, easeOutCubic);
    }, T_FLOOD));

    timers.push(setTimeout(finish, T_END));

    window.addEventListener("wheel", onSkip, { passive: true });
    window.addEventListener("touchstart", onSkip, { passive: true });
    window.addEventListener("keydown", onSkip);
    window.addEventListener("pointerdown", onSkip);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();
