/* CHAMP.MK intro — "four commits".
   Sequences the panel sweeps + deploy-log HUD, reveals the hero,
   then removes the overlay. Skippable; respects reduced-motion. */
(function () {
  "use strict";

  var intro = document.getElementById("intro");
  if (!intro) return;

  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduce) {
    // CSS already hides the overlay; just show the hero, no animation.
    document.body.classList.add("revealed");
    return;
  }

  var hud = intro.querySelector(".hud");
  var count = intro.querySelector(".hud-count");
  var text = intro.querySelector(".hud-text");

  // The personal twist: each step is a commit.
  var beats = [
    { t: 30,  c: "01/03", x: "init" },
    { t: 480, c: "02/03", x: "build" },
    { t: 900, c: "03/03", x: "ship" }
  ];

  var HANDOFF = 950;   // overlay backdrop goes transparent (hidden behind bars)
  var REVEAL  = 1150;  // hero flies into the screen as the bars peel away
  var END     = 2350;  // overlay gone + scroll unlocked, after the words land
  var timers = [];
  var finished = false;

  function set(c, x) {
    if (count) count.textContent = c;
    if (text) text.textContent = x;
  }

  function finish() {
    if (finished) return;
    finished = true;
    timers.forEach(clearTimeout);
    intro.classList.add("done");
    document.body.classList.remove("intro-active");
    document.body.classList.add("revealed");
    window.removeEventListener("wheel", onSkip, { passive: true });
    window.removeEventListener("touchstart", onSkip, { passive: true });
    window.removeEventListener("keydown", onSkip);
    window.removeEventListener("pointerdown", onSkip);
  }

  function onSkip(e) {
    if (e && e.type === "keydown" && (e.key === "Tab" || e.key === "Shift")) return;
    finish();
  }

  function start() {
    document.body.classList.add("intro-active");
    // next frame so the initial (off-screen) transforms are committed first
    requestAnimationFrame(function () {
      requestAnimationFrame(function () { intro.classList.add("play"); });
    });

    beats.forEach(function (b) {
      timers.push(setTimeout(function () { set(b.c, b.x); }, b.t));
    });
    timers.push(setTimeout(function () { intro.classList.add("reveal"); }, HANDOFF));
    timers.push(setTimeout(function () { if (hud) hud.classList.add("fade"); }, 1000));
    timers.push(setTimeout(function () { document.body.classList.add("revealed"); }, REVEAL));
    timers.push(setTimeout(finish, END));

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
