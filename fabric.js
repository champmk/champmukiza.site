/* fabric-te inspector. Plays three locked examples. Not the engine. */
(function () {
  "use strict";

  var canvas = document.getElementById("c");
  if (!canvas || !canvas.getContext) return;
  var ctx = canvas.getContext("2d");

  var GPU_W = 26;
  var GPU_H = 20;
  var LEAF_H = 36;
  var SPINE_W = 52;
  var SPINE_H = 28;

  var FRAMES = {
    A: ["leaves", "one-node", "same-rail", "counts"],
    B: ["ring", "slices", "hops", "T"],
    C: ["idle", "J1", "collective", "J2"]
  };
  var STEPS = {
    A: {
      leaves: "Leaves: eight rail switches under four spines.",
      "one-node": "One server: eight GPUs, one cable per rail.",
      "same-rail": "Same rail, two servers: the hop stays on that leaf. No spine.",
      counts: "32 servers, 256 GPUs, 256 host cables, 256 leaf–spine cables."
    },
    B: {
      ring: "Eight ranks. Each already has the weights; AllReduce will sum the gradients.",
      slices: "The 64 MiB buffer is split into eight chunks. A hop sends one chunk.",
      hops: "Every rank sends to the next at once. Reduce-scatter then allgather is 14 hops.",
      T: "T = 14 × 1 µs + 1.75 × 64 MiB / 50 GB/s = 2362.810 µs."
    },
    C: {
      naive: {
        idle: "Idle. Eight GPUs under the hot leaf, eight under the cool one.",
        J1: "Naive first-fit takes the first eight free GPUs, mixing both rails, and admits.",
        collective: "Four fabric hops cross onto the hot leaf. Four hops stay on the same server.",
        J2: "Naive admits the second job on what’s left. Both miss the deadline."
      },
      joint: {
        idle: "Same empty set. Joint will score leftover bandwidth, not just free GPUs.",
        J1: "Joint places all eight GPUs on the cool leaf and admits.",
        collective: "Every hop stays on that leaf. The collective meets the deadline.",
        J2: "Joint refuses the second job: GPUs remain on the hot leaf, but leftover on those paths is zero."
      }
    }
  };

  var state = { ex: "C", policy: "naive", frame: 0 };
  var packT = 0;

  function ink() {
    return getComputedStyle(document.documentElement).getPropertyValue("--ink").trim() || "#111";
  }
  function bg() {
    return getComputedStyle(document.documentElement).getPropertyValue("--bg").trim() || "#fff";
  }

  function vline(x, y1, y2) {
    ctx.beginPath();
    ctx.moveTo(x, y1);
    ctx.lineTo(x, y2);
    ctx.stroke();
  }
  function hline(x1, x2, y) {
    ctx.beginPath();
    ctx.moveTo(x1, y);
    ctx.lineTo(x2, y);
    ctx.stroke();
  }
  function hatch(x, y, w, h) {
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.clip();
    ctx.strokeStyle = ink();
    ctx.lineWidth = 1;
    for (var d = -h; d < w + h; d += 4) {
      ctx.beginPath();
      ctx.moveTo(x + d, y);
      ctx.lineTo(x + d + h, y + h);
      ctx.stroke();
    }
    ctx.restore();
  }
  function drawSwitch(x, y, w, h, title, portsBottom) {
    ctx.fillStyle = bg();
    ctx.strokeStyle = ink();
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.rect(x, y, w, h);
    ctx.fill();
    ctx.stroke();
    var n = 6;
    for (var i = 0; i < n; i++) {
      var px = x + (w * (i + 1)) / (n + 1);
      var py = portsBottom ? y + h : y;
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px, py + (portsBottom ? 4 : -4));
      ctx.stroke();
    }
    ctx.fillStyle = ink();
    ctx.font = "11px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(title, x + w / 2, y + h / 2);
  }
  function drawGpuAt(x, y, owner, tag) {
    var x0 = x - GPU_W / 2;
    var y0 = y - GPU_H / 2;
    ctx.lineWidth = 1.25;
    ctx.strokeStyle = ink();
    ctx.fillStyle = owner === 1 ? ink() : bg();
    ctx.beginPath();
    ctx.rect(x0, y0, GPU_W, GPU_H);
    ctx.fill();
    ctx.stroke();
    if (owner === 2) hatch(x0, y0, GPU_W, GPU_H);
    ctx.fillStyle = owner === 1 ? ink() : bg();
    ctx.strokeRect(x0 + 3, y0 - 5, 8, 5);
    ctx.strokeRect(x0 + 15, y0 - 5, 8, 5);
    if (owner === 1) {
      ctx.fillRect(x0 + 3, y0 - 5, 8, 5);
      ctx.fillRect(x0 + 15, y0 - 5, 8, 5);
    }
    ctx.beginPath();
    ctx.moveTo(x0 + 4, y0 + GPU_H);
    ctx.lineTo(x0 + 4, y0 + GPU_H + 4);
    ctx.moveTo(x0 + GPU_W / 2, y0 + GPU_H);
    ctx.lineTo(x0 + GPU_W / 2, y0 + GPU_H + 4);
    ctx.moveTo(x0 + GPU_W - 4, y0 + GPU_H);
    ctx.lineTo(x0 + GPU_W - 4, y0 + GPU_H + 4);
    ctx.stroke();
    ctx.font = "9px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    if (owner === 1) {
      ctx.fillStyle = bg();
      ctx.fillText(tag || "J1", x, y);
    } else if (owner === 2) {
      ctx.fillStyle = ink();
      ctx.fillText(tag || "J2", x, y);
    } else if (tag) {
      ctx.fillStyle = ink();
      ctx.fillText(tag, x, y);
    }
  }
  function drawPacket(p) {
    ctx.fillStyle = ink();
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  function along(points, u) {
    var segs = [];
    var total = 0;
    var i, a, b, len;
    for (i = 0; i < points.length - 1; i++) {
      a = points[i];
      b = points[i + 1];
      len = Math.hypot(b.x - a.x, b.y - a.y);
      segs.push({ a: a, b: b, len: len });
      total += len;
    }
    var d = u * total;
    for (i = 0; i < segs.length; i++) {
      var s = segs[i];
      if (d <= s.len) {
        var t = s.len === 0 ? 0 : d / s.len;
        return {
          x: s.a.x + (s.b.x - s.a.x) * t,
          y: s.a.y + (s.b.y - s.a.y) * t
        };
      }
      d -= s.len;
    }
    return points[points.length - 1];
  }

  var A_LEAF_Y = 230;
  var A_GPU_Y = 470;
  var A_BUS_Y = 70;
  var A_LEAVES = [];
  for (var r = 0; r < 8; r++) {
    var w = 88;
    var x = 92 + r * 110;
    A_LEAVES.push({ r: r, x: x, w: w, cx: x + w / 2 });
  }
  var A_SPINE = [190, 400, 610, 820];

  function drawA() {
    var f = FRAMES.A[state.frame];
    ctx.strokeStyle = ink();
    ctx.lineWidth = 1;
    hline(A_LEAVES[0].cx, A_LEAVES[7].cx, A_BUS_Y);
    var i;
    for (i = 0; i < 8; i++) vline(A_LEAVES[i].cx, A_LEAF_Y, A_BUS_Y);
    for (i = 0; i < 4; i++) {
      drawSwitch(A_SPINE[i] - SPINE_W / 2, A_BUS_Y - SPINE_H / 2, SPINE_W, SPINE_H, "S" + i, false);
    }
    for (i = 0; i < 8; i++) {
      var L = A_LEAVES[i];
      drawSwitch(L.x, A_LEAF_Y, L.w, LEAF_H, "r" + i, true);
    }
    if (f === "one-node" || f === "counts") {
      for (i = 0; i < 8; i++) {
        vline(A_LEAVES[i].cx, A_LEAF_Y + LEAF_H, A_GPU_Y - GPU_H / 2 - 5);
        drawGpuAt(A_LEAVES[i].cx, A_GPU_Y, f === "one-node" ? 1 : 0, "r" + i);
      }
    }
    if (f === "same-rail") {
      var leaf0 = A_LEAVES[0];
      var x0 = leaf0.cx - 18;
      var x1 = leaf0.cx + 18;
      vline(x0, A_LEAF_Y + LEAF_H, A_GPU_Y - GPU_H / 2 - 5);
      vline(x1, A_LEAF_Y + LEAF_H, A_GPU_Y - GPU_H / 2 - 5);
      drawGpuAt(x0, A_GPU_Y, 1, "n0");
      drawGpuAt(x1, A_GPU_Y, 1, "n1");
      drawPacket(along(
        [
          { x: x0, y: A_GPU_Y - GPU_H / 2 - 5 },
          { x: x0, y: A_LEAF_Y + LEAF_H },
          { x: x1, y: A_LEAF_Y + LEAF_H },
          { x: x1, y: A_GPU_Y - GPU_H / 2 - 5 }
        ],
        packT % 1
      ));
    }
    if (f === "counts") {
      ctx.fillStyle = ink();
      ctx.font = "13px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
      ctx.textAlign = "left";
      ctx.fillText("N=32   L=8   S=4   E_host=256   E_ls=256   B_bisect=51200 Gbps", 92, 560);
    }
  }

  function ringPos(i) {
    var ang = -Math.PI / 2 + (i * Math.PI) / 4;
    return { x: 500 + 190 * Math.cos(ang), y: 300 + 190 * Math.sin(ang) };
  }
  function drawB() {
    var f = FRAMES.B[state.frame];
    var pts = [];
    var i;
    for (i = 0; i < 8; i++) pts.push(ringPos(i));
    ctx.strokeStyle = ink();
    ctx.lineWidth = 1;
    for (i = 0; i < 8; i++) {
      ctx.beginPath();
      ctx.moveTo(pts[i].x, pts[i].y);
      ctx.lineTo(pts[(i + 1) % 8].x, pts[(i + 1) % 8].y);
      ctx.stroke();
    }
    for (i = 0; i < 8; i++) {
      drawGpuAt(pts[i].x, pts[i].y, 1, String(i));
      if (f === "slices" || f === "hops" || f === "T") {
        var p = pts[i];
        var dx = (p.x - 500) / 190;
        var dy = (p.y - 300) / 190;
        for (var k = 0; k < 8; k++) {
          ctx.strokeRect(p.x + dx * 28 - 10 + k * 3, p.y + dy * 28 - 6, 3, 8);
        }
      }
    }
    if (f === "hops") {
      for (i = 0; i < 8; i++) {
        drawPacket(along([pts[i], pts[(i + 1) % 8]], (packT + i / 8) % 1));
      }
    }
    if (f === "T") {
      ctx.fillStyle = ink();
      ctx.font = "13px ui-monospace, SFMono-Regular, Menlo, Consolas, monospace";
      ctx.textAlign = "center";
      ctx.fillText("T = 2362.810 µs", 500, 300);
    }
  }

  var PITCH = 40;
  var LEAF_Y = 230;
  var GPU_Y = 470;
  var BUS_Y = 70;
  var N_GPU = 8;
  var LEAF0 = { x: 140, w: N_GPU * PITCH };
  var LEAF1 = { x: 540, w: N_GPU * PITCH };
  var BUS = { x0: 140, x1: 540 + N_GPU * PITCH };
  function leafCenter(leaf) { return leaf.x + leaf.w / 2; }
  function gpuX(leaf, i) { return leaf.x + PITCH / 2 + i * PITCH; }
  function spineX(i) { return [190, 400, 610, 820][i]; }
  function portY() { return LEAF_Y + LEAF_H; }

  var H = [];
  var Cset = [];
  for (var gi = 0; gi < N_GPU; gi++) {
    H.push({ leaf: LEAF0, i: gi, id: "n" + [0, 1, 2, 3, 32, 33, 34, 35][gi] + "r0" });
    Cset.push({ leaf: LEAF1, i: gi, id: "n" + gi + "r1" });
  }
  var NAIVE_J1 = { n0r0: 1, n1r0: 1, n2r0: 1, n3r0: 1, n0r1: 1, n1r1: 1, n2r1: 1, n3r1: 1 };
  var NAIVE_J2 = { n32r0: 1, n33r0: 1, n34r0: 1, n35r0: 1, n4r1: 1, n5r1: 1, n6r1: 1, n7r1: 1 };
  var JOINT_J1 = {};
  Cset.forEach(function (g) { JOINT_J1[g.id] = 1; });

  function owner(id) {
    var f = FRAMES.C[state.frame];
    if (f === "idle") return 0;
    if (state.policy === "joint") return JOINT_J1[id] ? 1 : 0;
    if (NAIVE_J1[id]) return 1;
    if (NAIVE_J2[id] && f === "J2") return 2;
    return 0;
  }
  function pathPoints(srcLeaf, srcI, dstLeaf, dstI) {
    var sx = gpuX(srcLeaf, srcI);
    var dx = gpuX(dstLeaf, dstI);
    var sy = GPU_Y - GPU_H / 2 - 5;
    var py = portY();
    var sc = leafCenter(srcLeaf);
    var dc = leafCenter(dstLeaf);
    if (srcLeaf === dstLeaf) {
      return [
        { x: sx, y: sy }, { x: sx, y: py }, { x: dx, y: py }, { x: dx, y: sy }
      ];
    }
    return [
      { x: sx, y: sy }, { x: sx, y: py }, { x: sc, y: py }, { x: sc, y: LEAF_Y },
      { x: sc, y: BUS_Y }, { x: dc, y: BUS_Y }, { x: dc, y: LEAF_Y }, { x: dc, y: py },
      { x: dx, y: py }, { x: dx, y: sy }
    ];
  }
  function drawC() {
    var f = FRAMES.C[state.frame];
    ctx.strokeStyle = ink();
    ctx.lineWidth = 1;
    var i;
    for (i = 0; i < N_GPU; i++) {
      vline(gpuX(LEAF0, i), portY(), GPU_Y - GPU_H / 2 - 5);
      vline(gpuX(LEAF1, i), portY(), GPU_Y - GPU_H / 2 - 5);
    }
    vline(leafCenter(LEAF0), LEAF_Y, BUS_Y);
    vline(leafCenter(LEAF1), LEAF_Y, BUS_Y);
    hline(BUS.x0, BUS.x1, BUS_Y);
    for (i = 0; i < 4; i++) {
      var sx = spineX(i);
      drawSwitch(sx - SPINE_W / 2, BUS_Y - SPINE_H / 2, SPINE_W, SPINE_H, "S" + i, false);
    }
    drawSwitch(LEAF0.x, LEAF_Y, LEAF0.w, LEAF_H, "leaf r0", true);
    drawSwitch(LEAF1.x, LEAF_Y, LEAF1.w, LEAF_H, "leaf r1", true);
    H.forEach(function (g) {
      var o = owner(g.id);
      drawGpuAt(gpuX(g.leaf, g.i), GPU_Y, o, o === 1 ? "J1" : o === 2 ? "J2" : "");
    });
    Cset.forEach(function (g) {
      var o = owner(g.id);
      drawGpuAt(gpuX(g.leaf, g.i), GPU_Y, o, o === 1 ? "J1" : o === 2 ? "J2" : "");
    });
    if (state.policy === "joint" && f === "J2") {
      H.forEach(function (g) {
        var gx = gpuX(g.leaf, g.i);
        var gy = GPU_Y;
        ctx.strokeStyle = ink();
        ctx.lineWidth = 1.25;
        ctx.beginPath();
        ctx.moveTo(gx - 8, gy - 8);
        ctx.lineTo(gx + 8, gy + 8);
        ctx.moveTo(gx + 8, gy - 8);
        ctx.lineTo(gx - 8, gy + 8);
        ctx.stroke();
      });
    }
    if (f === "collective") {
      var pairs = state.policy === "joint"
        ? [0, 1, 2, 3, 4, 5, 6, 7].map(function (i) { return [LEAF1, i, LEAF1, (i + 1) % 8]; })
        : [[LEAF1, 0, LEAF0, 1], [LEAF1, 1, LEAF0, 2], [LEAF1, 2, LEAF0, 3], [LEAF1, 3, LEAF0, 0]];
      pairs.forEach(function (p, k) {
        drawPacket(along(pathPoints(p[0], p[1], p[2], p[3]), (packT + k / pairs.length) % 1));
      });
    }
  }

  function caption() {
    var f = FRAMES[state.ex][state.frame];
    document.getElementById("label").textContent = f;
    var block = STEPS[state.ex];
    var text = state.ex === "C" ? block[state.policy][f] : block[f];
    document.getElementById("step").textContent = text;
  }
  function draw() {
    ctx.fillStyle = bg();
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    if (state.ex === "A") drawA();
    else if (state.ex === "B") drawB();
    else drawC();
    caption();
  }
  var reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  function render() {
    if (!reduce) packT += 0.008;
    draw();
    requestAnimationFrame(render);
  }

  function setEx(ex) {
    state.ex = ex;
    state.frame = 0;
    document.getElementById("tab-A").classList.toggle("on", ex === "A");
    document.getElementById("tab-B").classList.toggle("on", ex === "B");
    document.getElementById("tab-C").classList.toggle("on", ex === "C");
    document.getElementById("tab-A").setAttribute("aria-selected", ex === "A" ? "true" : "false");
    document.getElementById("tab-B").setAttribute("aria-selected", ex === "B" ? "true" : "false");
    document.getElementById("tab-C").setAttribute("aria-selected", ex === "C" ? "true" : "false");
    document.getElementById("copy-A").classList.toggle("on", ex === "A");
    document.getElementById("copy-B").classList.toggle("on", ex === "B");
    document.getElementById("copy-C").classList.toggle("on", ex === "C");
    document.getElementById("c-only").classList.toggle("on", ex === "C");
  }
  function syncPolicy() {
    document.getElementById("naive").classList.toggle("on", state.policy === "naive");
    document.getElementById("joint").classList.toggle("on", state.policy === "joint");
  }
  document.getElementById("tab-A").onclick = function () { setEx("A"); };
  document.getElementById("tab-B").onclick = function () { setEx("B"); };
  document.getElementById("tab-C").onclick = function () { setEx("C"); };
  document.getElementById("naive").onclick = function () { state.policy = "naive"; syncPolicy(); };
  document.getElementById("joint").onclick = function () { state.policy = "joint"; syncPolicy(); };
  document.getElementById("prev").onclick = function () {
    var n = FRAMES[state.ex].length;
    state.frame = (state.frame + n - 1) % n;
  };
  document.getElementById("next").onclick = function () {
    var n = FRAMES[state.ex].length;
    state.frame = (state.frame + 1) % n;
  };
  window.addEventListener("keydown", function (e) {
    if (e.metaKey || e.ctrlKey || e.altKey) return;
    var t = e.target;
    if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.isContentEditable)) return;
    var n = FRAMES[state.ex].length;
    if (e.key === "ArrowRight") state.frame = (state.frame + 1) % n;
    if (e.key === "ArrowLeft") state.frame = (state.frame + n - 1) % n;
    if (e.key === "1") setEx("A");
    if (e.key === "2") setEx("B");
    if (e.key === "3") setEx("C");
  });

  setEx("C");
  document.getElementById("c-only").classList.add("on");
  render();
})();
