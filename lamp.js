/* The lamp is the theme switch — and a real object.
   Pull the chain (or click the base): the bulb flickers, then it's night or day.
   Grab the shade: the head aims and the pool on the letters follows.
   Grab an arm: the joint folds; the springs go with it.
   Toggle it like a maniac: the bulb burns out; screw in a new one.
   The chain hangs plumb. Gravity doesn't care where you pointed it. */
(function () {
  "use strict";

  var lamp = document.querySelector(".lamp");
  if (!lamp) return;

  var root = document.documentElement;
  var wrap = lamp.parentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var svg = lamp.querySelector("svg");
  var lower = lamp.querySelector(".l-lower");
  var upper = lamp.querySelector(".l-upper");
  var head = lamp.querySelector(".l-head");
  var chain = lamp.querySelector(".l-chain");
  var socket = lamp.querySelector(".l-socket");
  var hitLower = lamp.querySelector(".l-hit-lower");
  var hitUpper = lamp.querySelector(".l-hit-upper");

  var LIM = {
    lower: [-28, 34],
    upper: [-40, 44],
    head:  [-38, 30]
  };

  var pose = { lower: 0, upper: 0, head: 0 };
  try {
    var saved = JSON.parse(sessionStorage.getItem("champ-lamp") || "null");
    if (saved && typeof saved.lower === "number") {
      pose.lower = clamp(saved.lower, LIM.lower);
      pose.upper = clamp(saved.upper, LIM.upper);
      pose.head  = clamp(saved.head,  LIM.head);
    }
  } catch (e) {}

  function isLight() { return root.dataset.theme === "light"; }
  function clamp(v, r) { return Math.max(r[0], Math.min(r[1], v)); }
  function syncPressed() { lamp.setAttribute("aria-pressed", isLight() ? "true" : "false"); }
  syncPressed();

  function svgPoint(el, x, y) {
    var pt = svg.createSVGPoint();
    pt.x = x; pt.y = y;
    var m = el.getScreenCTM();
    return m ? pt.matrixTransform(m) : { x: 0, y: 0 };
  }
  function localToSvg(el, x, y) {
    var pt = svg.createSVGPoint();
    pt.x = x; pt.y = y;
    var m = el.getCTM();
    return m ? pt.matrixTransform(m) : { x: x, y: y };
  }
  function scaleOf(el) {
    var m = el.getScreenCTM();
    return m ? Math.hypot(m.a, m.b) : 1;
  }

  /* Rim of the shade, in SVG space. The chain is a root group so +y is always down. */
  var CHAIN_RIM = { x: 118.4, y: 100.2 };

  function applyPose(chainDy) {
    lower.setAttribute("transform", "rotate(" + pose.lower + " 60 143)");
    upper.setAttribute("transform", "rotate(" + pose.upper + " 80 96)");
    head.setAttribute("transform", "rotate(" + pose.head + " 104 72)");
    var rim = localToSvg(head, CHAIN_RIM.x, CHAIN_RIM.y);
    chain.setAttribute("transform", "translate(" + rim.x + " " + rim.y + ") translate(0 " + (chainDy || 0) + ")");
    syncPool();
  }

  function savePose() {
    try { sessionStorage.setItem("champ-lamp", JSON.stringify(pose)); } catch (e) {}
  }

  /* Pool on the letters: a point along the beam, in the overlay's space. */
  function syncPool() {
    if (!wrap) return;
    var src = svgPoint(head, 104, 108);
    var dst = svgPoint(head, 104, 168);
    var px = src.x + (dst.x - src.x) * 0.55;
    var py = src.y + (dst.y - src.y) * 0.55;
    var wr = wrap.getBoundingClientRect();
    var bx = wr.left - 1.5 * wr.width;
    var by = wr.top - 3.5 * wr.height;
    var bw = 4 * wr.width;
    var bh = 10 * wr.height;
    wrap.style.setProperty("--pool-x", ((px - bx) / bw * 100).toFixed(2) + "%");
    wrap.style.setProperty("--pool-y", ((py - by) / bh * 100).toFixed(2) + "%");
  }

  window.addEventListener("resize", function () { applyPose(); });
  document.addEventListener("champ:theme", syncPool);

  /* ---------- tiny gesture sounds (only ever on explicit clicks) ---------- */
  var actx = null;
  function blip(freq, dur, vol, type) {
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      if (actx.state === "suspended") actx.resume();
      var t = actx.currentTime;
      var o = actx.createOscillator();
      var g = actx.createGain();
      o.type = type || "square";
      o.frequency.value = freq;
      g.gain.setValueAtTime(vol, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g);
      g.connect(actx.destination);
      o.start(t);
      o.stop(t + dur + 0.01);
    } catch (e) {}
  }
  function tick() {
    blip(1900, 0.025, 0.055);
    window.setTimeout(function () { blip(1350, 0.04, 0.07); }, 38);
  }
  function pop() {
    blip(240, 0.11, 0.13);
    blip(70, 0.16, 0.07, "sine");
  }

  /* ---------- theme ---------- */
  var busy = false;
  var burnt = false;
  var recent = [];

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
    lamp.title = "…you burned the bulb out. Click the bulb to screw in a new one.";
    applyTheme(false);
  }

  function replaceBulb() {
    burnt = false;
    recent = [];
    lamp.classList.remove("burnt");
    lamp.title = "Pull the chain to switch. Grab the shade to aim. Grab an arm to pose it.";
    applyTheme(false);

    function seated() {
      if (reduce) return;
      lamp.classList.add("flicker");
      window.setTimeout(function () { lamp.classList.remove("flicker"); }, 640);
    }

    if (reduce || !socket) { seated(); return; }

    var t0 = performance.now();
    function step(now) {
      var t = Math.min(1, (now - t0) / 720);
      var ease = 1 - Math.pow(1 - t, 3);
      var rot = -300 * (1 - ease);
      var drop = 6 * (1 - ease);
      socket.setAttribute("transform", "rotate(" + rot + " 104 99) translate(0 " + drop + ")");
      if (t < 1) requestAnimationFrame(step);
      else {
        socket.removeAttribute("transform");
        seated();
      }
    }
    requestAnimationFrame(step);
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
    window.setTimeout(function () { applyTheme(toLight); }, 280);
    window.setTimeout(function () { lamp.classList.remove("flicker"); busy = false; }, 640);
  }

  /* Click the shade and it nods — that's not the switch. The chain is. */
  var nudging = false;
  function nudge() {
    if (reduce || nudging || aim || arm) return;
    nudging = true;
    var from = pose.head;
    var peak = clamp(from + (from >= 0 ? -5 : 5), LIM.head);
    var t0 = performance.now();
    function step(now) {
      var t = Math.min(1, (now - t0) / 280);
      var s = Math.sin(t * Math.PI);
      pose.head = from + (peak - from) * s;
      applyPose();
      if (t < 1) requestAnimationFrame(step);
      else { pose.head = from; applyPose(); nudging = false; }
    }
    requestAnimationFrame(step);
  }

  /* ---------- click (suppressed right after a drag) ---------- */
  var dragged = false;
  lamp.addEventListener("click", function (e) {
    if (dragged) { dragged = false; return; }
    var t = e.target;
    var cls = t && t.closest ? t.closest(".l-socket, .l-bulb, .l-crack, .l-spec, .l-base") : null;
    if (burnt) {
      if (cls) replaceBulb();
      return;
    }
    if (t && t.closest && t.closest(".l-head") && !t.closest(".l-chain")) {
      nudge();
      return;
    }
    if (t && t.closest && t.closest(".l-hit")) return;
    toggle();
  });

  /* ---------- pull the chain ---------- */
  var chainDrag = null;
  chain.addEventListener("pointerdown", function (e) {
    if (burnt) return;
    e.preventDefault();
    e.stopPropagation();
    chain.setPointerCapture(e.pointerId);
    chainDrag = { y0: e.clientY, dy: 0 };
  });
  chain.addEventListener("pointermove", function (e) {
    if (!chainDrag) return;
    var s = scaleOf(svg);
    chainDrag.dy = Math.max(0, Math.min(9, (e.clientY - chainDrag.y0) / s));
    if (chainDrag.dy > 1.5) dragged = true;
    applyPose(chainDrag.dy);
  });
  function chainRelease() {
    if (!chainDrag) return;
    var pulled = chainDrag.dy > 5;
    chainDrag = null;
    applyPose(0);
    if (pulled) { tick(); toggle(); }
  }
  chain.addEventListener("pointerup", chainRelease);
  chain.addEventListener("pointercancel", chainRelease);

  /* ---------- aim the head / fold an arm ---------- */
  var aim = null;
  var arm = null;

  function pointerAngle(cx, cy, e) {
    return Math.atan2(e.clientY - cy, e.clientX - cx) * 180 / Math.PI;
  }

  head.addEventListener("pointerdown", function (e) {
    if (chainDrag || e.target.closest(".l-chain")) return;
    e.preventDefault();
    head.setPointerCapture(e.pointerId);
    lamp.classList.add("aiming");
    var p = svgPoint(upper, 104, 72);
    aim = { a0: pointerAngle(p.x, p.y, e), start: pose.head, px: p.x, py: p.y };
  });
  head.addEventListener("pointermove", function (e) {
    if (!aim) return;
    var next = aim.start + (pointerAngle(aim.px, aim.py, e) - aim.a0);
    pose.head = clamp(next, LIM.head);
    if (Math.abs(pose.head - aim.start) > 2) dragged = true;
    applyPose();
  });
  function aimRelease() {
    if (!aim) return;
    aim = null;
    lamp.classList.remove("aiming");
    savePose();
  }
  head.addEventListener("pointerup", aimRelease);
  head.addEventListener("pointercancel", aimRelease);

  function bindArm(hit, key, originEl, ox, oy) {
    hit.addEventListener("pointerdown", function (e) {
      if (chainDrag || aim) return;
      e.preventDefault();
      e.stopPropagation();
      hit.setPointerCapture(e.pointerId);
      lamp.classList.add("posing");
      var p = svgPoint(originEl, ox, oy);
      arm = { key: key, a0: pointerAngle(p.x, p.y, e), start: pose[key], px: p.x, py: p.y };
    });
    hit.addEventListener("pointermove", function (e) {
      if (!arm || arm.key !== key) return;
      var next = arm.start + (pointerAngle(arm.px, arm.py, e) - arm.a0);
      pose[key] = clamp(next, LIM[key]);
      if (Math.abs(pose[key] - arm.start) > 2) dragged = true;
      applyPose();
    });
    function release() {
      if (!arm || arm.key !== key) return;
      arm = null;
      lamp.classList.remove("posing");
      savePose();
    }
    hit.addEventListener("pointerup", release);
    hit.addEventListener("pointercancel", release);
  }

  bindArm(hitLower, "lower", svg, 60, 143);
  bindArm(hitUpper, "upper", lower, 80, 96);

  applyPose();
  requestAnimationFrame(function () { applyPose(); });
})();
