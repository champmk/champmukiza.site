/* The lamp is the theme switch — and a real object.
   Click it (or pull the chain): the bulb flickers, then it's night or day.
   Grab the shade: the head aims and the beam follows.
   Toggle it like a maniac: the bulb burns out, and you'll have to screw
   in a new one. Choice of theme is remembered. */
(function () {
  "use strict";

  var lamp = document.querySelector(".lamp");
  if (!lamp) return;

  var root = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var head = lamp.querySelector(".l-head");
  var chain = lamp.querySelector(".l-chain");
  var svg = lamp.querySelector("svg");

  var VB_W = 150, VB_H = 160;          // the SVG's viewBox
  var PIVOT = { x: 104, y: 72 };       // head pivot, in viewBox units

  function isLight() { return root.dataset.theme === "light"; }
  function syncPressed() { lamp.setAttribute("aria-pressed", isLight() ? "true" : "false"); }
  syncPressed();

  /* ---------- tiny gesture sounds (only ever on explicit clicks) ---------- */
  var actx = null;
  function blip(freq, dur, vol) {
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === "suspended") actx.resume();
      var t = actx.currentTime;
      var o = actx.createOscillator();
      var g = actx.createGain();
      o.type = "square";
      o.frequency.value = freq;
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g);
      g.connect(actx.destination);
      o.start(t);
      o.stop(t + dur + 0.01);
    } catch (e) {}
  }
  function tick() { blip(2400, 0.05, 0.08); }   // the chain's switch
  function pop()  { blip(300, 0.10, 0.12); }    // the filament giving up

  /* ---------- theme ---------- */
  var busy = false;
  var burnt = false;
  var recent = [];   // toggle timestamps, for burnout

  function applyTheme(toLight) {
    root.dataset.theme = toLight ? "light" : "dark";
    try { localStorage.setItem("theme", root.dataset.theme); } catch (e) {}
    syncPressed();
    document.dispatchEvent(new CustomEvent("champ:theme"));
  }

  function burnout() {
    burnt = true;
    busy = false;
    pop();
    lamp.classList.remove("flicker");
    lamp.classList.add("burnt");
    lamp.title = "…you burned the bulb out. Click it to screw in a new one.";
    applyTheme(false);   // a dead lamp means a dark room
  }

  function replaceBulb() {
    burnt = false;
    recent = [];
    lamp.classList.remove("burnt");
    lamp.title = "Click the lamp — or pull the chain. The head aims, too.";
    if (!reduce) {
      lamp.classList.add("flicker");
      window.setTimeout(function () { lamp.classList.remove("flicker"); }, 640);
    }
    applyTheme(false);   // the new bulb lights the night
  }

  function toggle() {
    if (busy || burnt) return;

    var now = Date.now();
    recent.push(now);
    recent = recent.filter(function (t) { return now - t < 6000; });
    if (recent.length >= 7) { burnout(); return; }

    var toLight = !isLight();
    if (reduce) { applyTheme(toLight); return; }

    busy = true;
    lamp.classList.add("flicker");
    // switch part-way through the flicker, so the light "settles" into the new state
    window.setTimeout(function () { applyTheme(toLight); }, 280);
    window.setTimeout(function () { lamp.classList.remove("flicker"); busy = false; }, 640);
  }

  /* ---------- click (suppressed right after a drag) ---------- */
  var dragged = false;
  lamp.addEventListener("click", function (e) {
    if (dragged) { dragged = false; return; }
    if (burnt) {
      var cls = e.target && e.target.getAttribute && e.target.getAttribute("class");
      if (cls === "l-bulb" || cls === "l-crack" || cls === "l-spec") replaceBulb();
      return;
    }
    toggle();
  });

  /* ---------- geometry helpers ---------- */
  function pivotClient() {
    var r = svg.getBoundingClientRect();
    return {
      x: r.left + r.width * (PIVOT.x / VB_W),
      y: r.top + r.height * (PIVOT.y / VB_H),
      scale: r.height / VB_H
    };
  }

  /* ---------- aim state (shared: the chain must hang plumb) ---------- */
  var MIN_A = -30, MAX_A = 24;   // don't let it stare at its own arm
  var angle = 0;

  /* The chain is inside the rotating head group, so it counter-rotates
     by the head's angle to keep pointing at the floor. */
  function chainTransform(dy) {
    return "rotate(" + (-angle) + "deg) translateY(" + (dy || 0) + "px)";
  }

  /* ---------- pull the chain ---------- */
  var chainDrag = null;
  chain.addEventListener("pointerdown", function (e) {
    if (burnt) return;
    e.preventDefault();
    e.stopPropagation();
    chain.setPointerCapture(e.pointerId);
    chain.style.transition = "none";
    chainDrag = { y0: e.clientY, dy: 0 };
  });
  chain.addEventListener("pointermove", function (e) {
    if (!chainDrag) return;
    var p = pivotClient();
    chainDrag.dy = Math.max(0, Math.min(9, (e.clientY - chainDrag.y0) / p.scale));
    if (chainDrag.dy > 1.5) dragged = true;
    chain.style.transform = chainTransform(chainDrag.dy);
  });
  function chainRelease() {
    if (!chainDrag) return;
    var pulled = chainDrag.dy > 5;
    chainDrag = null;
    chain.style.transition = reduce ? "" : "transform 0.3s cubic-bezier(0.3, 1.8, 0.4, 1)";
    chain.style.transform = chainTransform(0);
    if (pulled) { tick(); toggle(); }
  }
  chain.addEventListener("pointerup", chainRelease);
  chain.addEventListener("pointercancel", chainRelease);

  /* ---------- aim the head ---------- */
  var aim = null;

  function pointerAngle(e) {
    var p = pivotClient();
    return Math.atan2(e.clientY - p.y, e.clientX - p.x) * 180 / Math.PI;
  }

  head.addEventListener("pointerdown", function (e) {
    if (chainDrag) return;
    e.preventDefault();
    head.setPointerCapture(e.pointerId);
    lamp.classList.add("aiming");
    aim = { a0: pointerAngle(e), start: angle };
  });
  head.addEventListener("pointermove", function (e) {
    if (!aim) return;
    var next = aim.start + (pointerAngle(e) - aim.a0);
    angle = Math.max(MIN_A, Math.min(MAX_A, next));
    if (Math.abs(angle - aim.start) > 2) dragged = true;
    head.style.transform = "rotate(" + angle + "deg)";
    chain.style.transform = chainTransform(0);   // still hangs straight down
  });
  function aimRelease() {
    aim = null;
    lamp.classList.remove("aiming");   // the head stays where you aimed it
  }
  head.addEventListener("pointerup", aimRelease);
  head.addEventListener("pointercancel", aimRelease);
})();
