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
