/* The lamp is the theme switch.
   Click it: the bulb flickers, then turns ON (light theme) or OFF (dark theme).
   Choice is remembered. */
(function () {
  "use strict";

  var lamp = document.querySelector(".lamp");
  if (!lamp) return;

  var root = document.documentElement;
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function isLight() { return root.dataset.theme === "light"; }
  function syncPressed() { lamp.setAttribute("aria-pressed", isLight() ? "true" : "false"); }
  syncPressed();

  var busy = false;

  function applyTheme(toLight) {
    root.dataset.theme = toLight ? "light" : "dark";
    try { localStorage.setItem("theme", root.dataset.theme); } catch (e) {}
    syncPressed();
  }

  lamp.addEventListener("click", function () {
    if (busy) return;
    var toLight = !isLight();

    if (reduce) { applyTheme(toLight); return; }

    busy = true;
    lamp.classList.add("flicker");
    // switch part-way through the flicker, so the light "settles" into the new state
    window.setTimeout(function () { applyTheme(toLight); }, 280);
    window.setTimeout(function () { lamp.classList.remove("flicker"); busy = false; }, 640);
  });
})();
