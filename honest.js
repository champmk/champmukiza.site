/* The honesty layer.
   Real numbers or no numbers: the footer names the exact commit this page
   is. If an API is down, the line simply doesn't appear — nothing here
   is ever made up. */
(function () {
  "use strict";
  if (!window.fetch) return;

  /* Which commit is this page? */
  var commit = document.getElementById("commit-line");
  if (commit) {
    fetch("https://api.github.com/repos/champmk/champmukiza.site/commits?per_page=1")
      .then(function (r) { return r.ok ? r.json() : Promise.reject(); })
      .then(function (d) {
        var c = d && d[0];
        if (!c || !c.sha || !c.commit) return;
        var msg = (c.commit.message || "").split("\n")[0];
        commit.textContent = "This page is commit " + c.sha.slice(0, 7) + " — “" + msg + "”";
        commit.hidden = false;
      })
      .catch(function () {});
  }

  /* For the people who open the console. You're my kind of visitor. */
  try {
    var lamp = [
      "      _",
      "     | \\",
      "     |  \\",
      "     |___\\_",
      "     (_(o)_)   *click*",
      "    _/_____\\_"
    ].join("\n");
    console.log(
      "%c" + lamp + "\n\n%cThe light is real.%c\n" +
      "No build step, no framework — View Source is the actual site.\n" +
      "How it’s made → https://champmukiza.site/colophon.html",
      "color:#16e16a;font-family:monospace",
      "color:#ffcf5a;font-weight:bold;font-size:14px",
      "color:inherit"
    );
  } catch (e) {}
})();
