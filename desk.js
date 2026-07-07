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

/* The favicon is the bulb, and it obeys the lamp too. */
(function () {
  "use strict";

  var link = document.querySelector('link[rel="icon"]');
  if (!link) return;

  function icon(lit) {
    var body = lit
      ? '<circle cx="32" cy="31" r="19" fill="#ffcf5a" opacity="0.22"/>' +
        '<path d="M32 14 q-10 8 -10 15.5 a10 10 0 1 0 20 0 q0 -7.5 -10 -15.5" fill="#ffd35a"/>' +
        '<path d="M27 45 h10 l-1.2 6 h-7.6 z" fill="#8a877e"/>'
      : '<path d="M32 14 q-10 8 -10 15.5 a10 10 0 1 0 20 0 q0 -7.5 -10 -15.5" fill="#8b857c"/>' +
        '<path d="M27 45 h10 l-1.2 6 h-7.6 z" fill="#76736a"/>';
    var bg = lit ? "#0a0a0a" : "#f4f1ea";
    var svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
      '<rect width="64" height="64" rx="13" fill="' + bg + '"/>' + body + "</svg>";
    return "data:image/svg+xml," + encodeURIComponent(svg);
  }

  function sync() { link.href = icon(document.documentElement.dataset.theme !== "light"); }
  sync();
  document.addEventListener("champ:theme", sync);
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

/* The margin objects draw themselves in as you reach them. */
(function () {
  "use strict";

  var entries = document.querySelectorAll(".entry");
  if (!entries.length) return;
  if (!("IntersectionObserver" in window)) {
    entries.forEach(function (e) { e.classList.add("lit"); });
    return;
  }
  var io = new IntersectionObserver(function (hits) {
    hits.forEach(function (h) {
      if (h.isIntersecting) { h.target.classList.add("lit"); io.unobserve(h.target); }
    });
  }, { threshold: 0.3 });
  entries.forEach(function (e) { io.observe(e); });
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
