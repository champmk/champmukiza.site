/* The site runs on my desk's clock, not yours.
   First visits default to Seattle time (set pre-paint in <head>); this file
   keeps the footer's desk line honest and ticking. */
(function () {
  "use strict";

  var el = document.getElementById("desk-clock");
  if (!el) return;

  var fmt;
  try {
    fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: "America/Los_Angeles",
      hour: "numeric",
      minute: "2-digit",
      hour12: true
    });
  } catch (e) { return; } // no clock, no line — never guess

  function update() {
    var time = fmt.format(new Date()).toLowerCase().replace(/\s/g, " ");
    var lampOn = document.documentElement.dataset.theme !== "light";
    el.textContent = "It’s " + time + " at my desk in Seattle. The lamp is " + (lampOn ? "on" : "off") + ".";
    el.hidden = false;
  }

  update();
  window.setInterval(update, 30000);
  document.addEventListener("champ:theme", update);
})();

/* champ, n.m. — hover the name for the dictionary entry; click to pin it. */
(function () {
  "use strict";

  var word = document.querySelector(".w-champ");
  var card = document.getElementById("champ-def");
  if (!word || !card) return;

  var pinned = false;

  function show() { card.hidden = false; word.setAttribute("aria-expanded", "true"); }
  function hide() { card.hidden = true; word.setAttribute("aria-expanded", "false"); }

  word.addEventListener("mouseenter", function () { if (!pinned) show(); });
  word.addEventListener("mouseleave", function () { if (!pinned) hide(); });
  word.addEventListener("click", function (e) {
    e.stopPropagation();
    pinned = !pinned;
    if (pinned) show(); else hide();
  });
  word.addEventListener("keydown", function (e) {
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); word.click(); }
  });
  document.addEventListener("click", function () { if (pinned) { pinned = false; hide(); } });
})();

/* Press "g": the baseline grid, for the designers who check. */
(function () {
  "use strict";
  document.addEventListener("keydown", function (e) {
    if (e.key !== "g" || e.metaKey || e.ctrlKey || e.altKey) return;
    var t = e.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
    document.body.classList.toggle("grid");
  });
})();
