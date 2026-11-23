/* chaoz.com · mosaic edition. No frameworks, just tiles. */
(() => {
  "use strict";

  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const root = document.documentElement;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} },
  };

  /* ───────── language ───────── */
  const lang = () => (root.dataset.lang === "zh" ? "zh" : "en");
  const T = {
    title: { en: "Chao Zhao · Systems @ OpenAI", zh: "Chao Zhao · OpenAI 系统工程师" },
    padStart: { en: "tap to start", zh: "点我开始" },
    padWait: { en: "wait for green…", zh: "等它变绿…" },
    padGo: { en: "NOW!", zh: "就是现在！" },
    padEarly: { en: "too early · retry", zh: "抢跑了 · 再来" },
    padAgain: { en: "again?", zh: "再来一次？" },
    ready: { en: "Ready when you are.", zh: "准备好了就开始。" },
    steady: { en: "Steady…", zh: "稳住…" },
    early: { en: "Race condition! You fired before the signal.", zh: "竞态条件！信号还没来你就开火了。" },
    copied: { en: "copied ✓", zh: "已复制 ✓" },
    future: { en: "Not written yet.", zh: "还没写。" },
    gap: { en: "Between chapters. Packing boxes.", zh: "两章之间，在打包行李。" },
    here: { en: "← you are here", zh: "← 你在这里" },
    yr: { en: " yr", zh: " 年" },
    mo: { en: " mo", zh: " 个月" },
  };
  const t = (k) => T[k][lang()];
  const VERDICTS = [
    [180, "Sub-200 ms. Are you doing kernel bypass?", "不到 200 毫秒，你是绕过内核了吗？"],
    [230, "Faster than most p50s I've debugged.", "比我调过的大多数 p50 都快。"],
    [290, "Solid. Ship it.", "稳。可以上线。"],
    [380, "Respectable. Maybe a GC pause?", "还行，可能碰上了 GC 停顿？"],
    [600, "Hmm. Did someone kick off a compaction?", "嗯……是不是有人在跑 compaction？"],
    [Infinity, "That's a p99.9 outlier. Try again?", "这是个 p99.9 离群值，再试一次？"],
  ];
  const BUDDY_LINES = {
    en: [
      "hi! I'm Tile 👋",
      "I'm 16 tiles in a trench coat.",
      "click Chao's name. it tickles.",
      "psst: ↑↑↓↓←→←→BA",
      "you can paint on the Game of Life!",
      "have you tried turning it off and on?",
      "I run on vanilla JS and vibes.",
      "my p99 is one blink.",
      "this site has a 中文 button up top!",
    ],
    zh: [
      "嗨！我叫小砖 👋",
      "我是 16 块方块拼成的。",
      "点一下名字试试，会痒。",
      "悄悄说：↑↑↓↓←→←→BA",
      "下面的生命游戏可以画画哦！",
      "试过关机再开机吗？",
      "我靠原生 JS 和氛围感运行。",
      "我的 p99 是眨一次眼。",
      "右上角可以切换 English！",
    ],
  };
  const langHooks = [];
  function applyLang(l) {
    root.dataset.lang = l;
    root.lang = l === "zh" ? "zh-CN" : "en";
    document.title = T.title[l];
    $("#lang-toggle").setAttribute("aria-label", l === "zh" ? "Switch to English" : "切换到中文");
    langHooks.forEach((fn) => fn());
  }
  $("#lang-toggle").addEventListener("click", () => {
    const next = lang() === "zh" ? "en" : "zh";
    store.set("lang", next);
    applyLang(next);
  });

  /* ───────── theme ───────── */
  const PAL = {};
  const PAL_KEYS = ["coral", "butter", "mint", "peri", "bubble", "lilac", "sky", "ink", "card", "bg", "bg-2", "line"];
  function refreshPalette() {
    const cs = getComputedStyle(root);
    PAL_KEYS.forEach((k) => (PAL[k] = cs.getPropertyValue("--" + k).trim()));
  }
  refreshPalette();
  const isDark = () =>
    root.dataset.theme ? root.dataset.theme === "dark" : matchMedia("(prefers-color-scheme: dark)").matches;
  $("#theme-toggle").addEventListener("click", () => {
    root.dataset.theme = isDark() ? "light" : "dark";
    store.set("theme", root.dataset.theme);
    refreshPalette();
    life.draw();
  });
  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
    refreshPalette();
    life.draw();
  });

  const TILE_KEYS = ["coral", "butter", "mint", "peri", "bubble", "lilac"];

  /* ───────── tile-font name ───────── */
  const GLYPHS = {
    C: [".###.", "#...#", "#....", "#....", "#....", "#...#", ".###."],
    H: ["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
    A: [".###.", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
    O: [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
    Z: ["#####", "....#", "...#.", "..#..", ".#...", "#....", "#####"],
  };
  $$(".tilefont").forEach((el, line) => {
    const text = el.dataset.text;
    const cols = text.length * 6 - 1;
    el.style.setProperty("--cols", cols);
    const frag = document.createDocumentFragment();
    for (let r = 0; r < 7; r++) {
      for (let c = 0; c < cols; c++) {
        const ch = text[Math.floor(c / 6)];
        const x = c % 6;
        const on = x < 5 && GLYPHS[ch][r][x] === "#";
        const tile = document.createElement("i");
        tile.className = on ? "t on" : "t";
        if (on) {
          if (Math.random() < 0.28) tile.dataset.c = pick(TILE_KEYS);
          tile.style.setProperty("--d", c * 22 + r * 30 + line * 260 + "ms");
        }
        frag.appendChild(tile);
      }
    }
    el.appendChild(frag);

    // hover: lit tiles change color, empty tiles leave a fading ghost
    el.addEventListener("pointerover", (e) => {
      const tile = e.target;
      if (!tile.classList || !tile.classList.contains("t")) return;
      if (tile.classList.contains("on")) {
        tile.dataset.c = pick(TILE_KEYS);
      } else {
        tile.style.setProperty("--gc", PAL[pick(TILE_KEYS)]);
        tile.classList.add("ghost");
        clearTimeout(tile._g);
        tile._g = setTimeout(() => tile.classList.remove("ghost"), 700);
      }
    });
  });

  // click the name: tiles scatter, then snap back
  $(".name").addEventListener("click", () => {
    $$(".t.on").forEach((tile) => (tile.dataset.c = pick(TILE_KEYS.concat([""]))));
    if (reduceMotion) return;
    $$(".tilefont").forEach((el) => {
      $$(".t.on", el).forEach((tile) => {
        tile.style.animation = "none";
        tile.style.setProperty("--sx", (Math.random() - 0.5) * 240 + "px");
        tile.style.setProperty("--sy", (Math.random() - 0.5) * 140 + "px");
        tile.style.setProperty("--sr", (Math.random() - 0.5) * 360 + "deg");
      });
      el.classList.add("scatter");
      setTimeout(() => el.classList.remove("scatter"), 480);
    });
  });

  /* ───────── redacted reveal ───────── */
  const redact = $(".redact");
  redact.addEventListener("click", () => {
    redact.setAttribute("aria-pressed", redact.getAttribute("aria-pressed") === "true" ? "false" : "true");
  });

  /* ───────── Game of Life ───────── */
  const life = (() => {
    const cv = $("#life");
    const ctx = cv.getContext("2d");
    const CELL = 14;
    let cols = 0, rows = 0, W = 0, H = 0, ox = 0, oy = 0;
    let grid = new Uint8Array(0), age = new Uint16Array(0);
    let gen = 0, visible = true, last = 0;
    const genEl = $("#gen");
    const AGE = ["butter", "coral", "bubble", "lilac", "peri", "mint"];
    const ageColor = (a) => PAL[AGE[a < 2 ? 0 : a < 4 ? 1 : a < 8 ? 2 : a < 16 ? 3 : a < 40 ? 4 : 5]];
    const hasRound = typeof ctx.roundRect === "function";

    function resize() {
      const r = cv.getBoundingClientRect();
      if (!r.width) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      W = r.width; H = r.height;
      cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      const nc = Math.floor((W - 8) / CELL), nr = Math.floor((H - 8) / CELL);
      ox = (W - nc * CELL) / 2; oy = (H - nr * CELL) / 2;
      if (nc !== cols || nr !== rows) { cols = nc; rows = nr; seed(); }
      draw();
      updateTileCount();
    }
    function set(x, y) {
      grid[((y + rows) % rows) * cols + ((x + cols) % cols)] = 1;
    }
    function glider(x, y) {
      [[1, 0], [2, 1], [0, 2], [1, 2], [2, 2]].forEach(([dx, dy]) => set(x + dx, y + dy));
    }
    function splat(cx, cy, r) {
      for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (Math.random() < 0.5) set(cx + dx, cy + dy);
    }
    function seed() {
      grid = new Uint8Array(cols * rows);
      age = new Uint16Array(cols * rows);
      for (let i = 0; i < grid.length; i++) grid[i] = Math.random() < 0.2 ? 1 : 0;
      for (let k = 0; k < 4; k++) glider(Math.floor(Math.random() * cols), Math.floor(Math.random() * rows));
      gen = 0;
    }
    function step() {
      const next = new Uint8Array(cols * rows);
      let pop = 0;
      for (let y = 0; y < rows; y++) {
        const ym = ((y - 1 + rows) % rows) * cols, y0 = y * cols, yp = ((y + 1) % rows) * cols;
        for (let x = 0; x < cols; x++) {
          const xm = (x - 1 + cols) % cols, xp = (x + 1) % cols;
          const n = grid[ym + xm] + grid[ym + x] + grid[ym + xp] + grid[y0 + xm] + grid[y0 + xp] + grid[yp + xm] + grid[yp + x] + grid[yp + xp];
          const i = y0 + x;
          const alive = grid[i] ? n === 2 || n === 3 : n === 3;
          next[i] = alive ? 1 : 0;
          age[i] = alive ? Math.min(age[i] + 1, 999) : 0;
          pop += next[i];
        }
      }
      grid = next;
      gen++;
      // keep it lively once it settles down
      if (pop < cols * rows * 0.05 || gen % 400 === 0) {
        for (let k = 0; k < 3; k++) glider(Math.floor(Math.random() * cols), Math.floor(Math.random() * rows));
        for (let k = 0; k < 2; k++) splat(Math.floor(Math.random() * cols), Math.floor(Math.random() * rows), 3);
      }
    }
    function cellRect(x, y) {
      const s = CELL - 3;
      const px = ox + x * CELL + 1.5, py = oy + y * CELL + 1.5;
      if (hasRound) { ctx.beginPath(); ctx.roundRect(px, py, s, s, 3.5); ctx.fill(); }
      else ctx.fillRect(px, py, s, s);
    }
    function draw() {
      if (!cols) return;
      ctx.clearRect(0, 0, W, H);
      ctx.fillStyle = PAL["bg-2"];
      for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) if (!grid[y * cols + x]) cellRect(x, y);
      for (let y = 0; y < rows; y++) {
        for (let x = 0; x < cols; x++) {
          const i = y * cols + x;
          if (grid[i]) { ctx.fillStyle = ageColor(age[i]); cellRect(x, y); }
        }
      }
      genEl.textContent = gen;
    }
    function loop(ts) {
      if (visible && !reduceMotion && ts - last > 120) {
        last = ts;
        step();
        draw();
      }
      requestAnimationFrame(loop);
    }

    let painting = false;
    function paintAt(e) {
      const r = cv.getBoundingClientRect();
      const x = Math.floor((e.clientX - r.left - ox) / CELL);
      const y = Math.floor((e.clientY - r.top - oy) / CELL);
      if (x < 0 || y < 0 || x >= cols || y >= rows) return;
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (Math.random() < 0.7) set(x + dx, y + dy);
      draw();
    }
    cv.addEventListener("pointerdown", (e) => { painting = true; cv.setPointerCapture(e.pointerId); paintAt(e); });
    cv.addEventListener("pointermove", (e) => painting && paintAt(e));
    ["pointerup", "pointercancel"].forEach((ev) => cv.addEventListener(ev, () => (painting = false)));

    new IntersectionObserver((ents) => ents.forEach((en) => (visible = en.isIntersecting))).observe(cv);
    new ResizeObserver(() => resize()).observe(cv);
    requestAnimationFrame(loop);
    return { draw, cells: () => cols * rows };
  })();

  /* ───────── Tile, the buddy ───────── */
  (() => {
    const buddy = $("#buddy"), bubble = $("#bubble");
    const pupils = $$(".eye i", buddy);
    let lineIdx = -1, hideT;
    window.addEventListener(
      "pointermove",
      (e) => {
        const r = buddy.getBoundingClientRect();
        const dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2);
        const d = Math.hypot(dx, dy) || 1;
        const k = Math.min(1, d / 220);
        pupils.forEach((p) => {
          p.style.setProperty("--ex", ((dx / d) * 3 * k).toFixed(2) + "px");
          p.style.setProperty("--ey", ((dy / d) * 3.2 * k).toFixed(2) + "px");
        });
      },
      { passive: true }
    );
    function say(text) {
      bubble.textContent = text;
      bubble.classList.add("show");
      clearTimeout(hideT);
      hideT = setTimeout(() => bubble.classList.remove("show"), 3200);
    }
    buddy.addEventListener("click", () => {
      const lines = BUDDY_LINES[lang()];
      lineIdx = (lineIdx + 1) % lines.length;
      say(lines[lineIdx]);
      buddy.classList.remove("jump");
      void buddy.offsetWidth;
      buddy.classList.add("jump");
    });
    // a little hello shortly after load
    setTimeout(() => { lineIdx = 0; say(BUDDY_LINES[lang()][0]); }, 1600);
    langHooks.push(() => bubble.classList.contains("show") && lineIdx >= 0 && (bubble.textContent = BUDDY_LINES[lang()][lineIdx]));
  })();

  /* ───────── months mosaic ───────── */
  const KEYS = {
    openai: { en: "OpenAI", zh: "OpenAI", c: "--c-openai" },
    rockset: { en: "Rockset", zh: "Rockset", c: "--c-rockset" },
    fb: { en: "Facebook", zh: "Facebook", c: "--c-fb" },
    intel: { en: "Intel", zh: "Intel", c: "--c-intel" },
    cmu: { en: "Carnegie Mellon", zh: "卡内基梅隆", c: "--c-cmu" },
    uw: { en: "UW summer", zh: "华盛顿大学暑校", c: "--c-uw" },
    sjtu: { en: "SJTU", zh: "上海交大", c: "--c-sjtu" },
    hs: { en: "High school", zh: "高中", c: "--c-hs" },
  };
  // later entries paint over earlier ones; every overlapping label still shows up in the tooltip
  const PERIODS = [
    ["hs", "2013-01", "2013-08", "High school (physics) · The Affiliated High School of Shanxi University", "高中（物理）· 山西大学附属中学"],
    ["sjtu", "2013-09", "2017-06", "B.S. Computer Science · Shanghai Jiao Tong University", "计算机科学学士 · 上海交通大学"],
    ["uw", "2015-06", "2015-08", "Summer session, Electrical Engineering · University of Washington", "暑期课程，电子工程 · 华盛顿大学"],
    ["intel", "2016-07", "2016-11", "Software Engineer · Intel, GPU virtualization (GVT-g)", "软件工程师 · Intel，GPU 虚拟化（GVT-g）"],
    ["cmu", "2017-08", "2018-12", "M.S. Computer Systems · Carnegie Mellon", "计算机系统硕士 · 卡内基梅隆大学"],
    ["fb", "2018-05", "2018-08", "Production Engineer (summer) · Facebook, Verifiable Log", "生产工程师（暑期）· Facebook，Verifiable Log"],
    ["fb", "2019-01", "2020-06", "Production Engineer · Facebook, ZippyDB", "生产工程师 · Facebook，ZippyDB"],
    ["fb", "2020-07", "2021-05", "Software Engineer · Facebook, Messaging Infra", "软件工程师 · Facebook，消息基础设施"],
    ["rockset", "2021-06", "2022-05", "Software Engineer · Rockset, SQL Optimizer", "软件工程师 · Rockset，SQL 优化器"],
    ["rockset", "2022-06", "2023-04", "Senior Software Engineer · Rockset, Query Performance", "高级软件工程师 · Rockset，查询性能"],
    ["rockset", "2023-05", "2024-05", "Staff Software Engineer & TL · Rockset, Query Optimizer", "Staff 软件工程师 & TL · Rockset，查询优化器"],
    ["openai", "2024-06", "2025-08", "MTS · OpenAI, Online Data (Applied AI)", "MTS · OpenAI，在线数据（Applied AI）"],
    ["openai", "2025-03", "2025-06", "MTS · OpenAI, Post-Training Systems (Research)", "MTS · OpenAI，后训练系统（研究）"],
    ["openai", "2025-09", "now", "MTS · OpenAI, Training Runtime (Research)", "MTS · OpenAI，训练运行时（研究）"],
  ];
  const MARKS = [];

  const today = new Date();
  const nowIdx = today.getFullYear() * 12 + today.getMonth();
  const idx = (s) => (s === "now" ? nowIdx : +s.slice(0, 4) * 12 + (+s.slice(5, 7) - 1));
  const MONTHS_EN = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const startYear = 2013, endYear = today.getFullYear();

  const gridEl = $("#months-grid");
  const counts = {};
  const tiles = [];
  const heads = [];
  const gfrag = document.createDocumentFragment();
  gfrag.appendChild(document.createElement("span"));
  for (let m = 0; m < 12; m++) {
    const h = document.createElement("span");
    h.className = "mh";
    heads.push(h);
    gfrag.appendChild(h);
  }
  let pastMonths = 0;
  for (let y = startYear; y <= endYear; y++) {
    const yl = document.createElement("span");
    yl.className = "yr";
    yl.textContent = "'" + String(y).slice(2);
    gfrag.appendChild(yl);
    for (let m = 0; m < 12; m++) {
      const i = y * 12 + m;
      const el = document.createElement("span");
      el.className = "m";
      const info = { el, y, m, hits: [], marks: [], future: i > nowIdx, now: i === nowIdx };
      if (!info.future) {
        pastMonths++;
        info.hits = PERIODS.filter((p) => i >= idx(p[1]) && i <= idx(p[2]));
        info.marks = MARKS.filter((p) => i >= idx(p[0]) && i <= idx(p[1]));
        if (info.hits.length) {
          const k = info.hits[info.hits.length - 1][0];
          el.dataset.k = k;
          el.style.setProperty("--c", `var(${KEYS[k].c})`);
          counts[k] = (counts[k] || 0) + 1;
        } else {
          el.classList.add("gap");
        }
        if (info.marks.length) el.classList.add("mark");
        if (info.now) el.classList.add("now");
      } else {
        el.classList.add("future");
      }
      el._info = info;
      tiles.push(el);
      gfrag.appendChild(el);
    }
  }
  gridEl.appendChild(gfrag);
  $("#stat-months").textContent = pastMonths;

  function renderMonthHeads() {
    heads.forEach((h, m) => (h.textContent = lang() === "zh" ? String(m + 1) : MONTHS_EN[m][0]));
  }
  renderMonthHeads();
  langHooks.push(renderMonthHeads);

  // legend: hover to light up a chapter (no buttons, no knobs)
  const legend = $("#legend");
  function renderLegend() {
    legend.innerHTML = "";
    Object.entries(KEYS).forEach(([k, v]) => {
      const li = document.createElement("li");
      li.style.setProperty("--c", `var(${v.c})`);
      const n = counts[k] || 0;
      const dur = n >= 12 ? +(n / 12).toFixed(1) + t("yr") : n + t("mo");
      li.innerHTML = `<span class="sw"></span><span class="lb"></span><span class="ct"></span>`;
      li.querySelector(".lb").textContent = v[lang()];
      li.querySelector(".ct").textContent = dur;
      li.addEventListener("pointerenter", () => (gridEl.dataset.filter = k));
      li.addEventListener("pointerleave", () => delete gridEl.dataset.filter);
      legend.appendChild(li);
    });
  }
  renderLegend();
  langHooks.push(renderLegend);

  // tooltip
  const tip = $("#tip");
  function showTip(el) {
    const info = el._info;
    const zh = lang() === "zh";
    const r = el.getBoundingClientRect();
    tip.innerHTML = "";
    const b = document.createElement("b");
    b.textContent = zh ? `${info.y} 年 ${info.m + 1} 月` : `${MONTHS_EN[info.m]} ${info.y}`;
    tip.appendChild(b);
    let lines;
    if (info.future) lines = [t("future")];
    else {
      lines = info.hits.map((h) => (zh ? h[4] : h[3])).concat(info.marks.map((mk) => (zh ? mk[3] : mk[2])));
      if (!lines.length) lines = [t("gap")];
      if (info.now) lines.push(t("here"));
    }
    lines.forEach((l, n) => {
      if (n) tip.appendChild(document.createElement("br"));
      tip.appendChild(document.createTextNode(l));
    });
    tip.style.setProperty("--c", el.dataset.k ? `var(${KEYS[el.dataset.k].c})` : "var(--ink-3)");
    tip.hidden = false;
    const tw = tip.offsetWidth;
    tip.style.left = Math.min(Math.max(r.left + r.width / 2, tw / 2 + 8), window.innerWidth - tw / 2 - 8) + "px";
    tip.style.top = r.top + "px";
  }
  gridEl.addEventListener("pointerover", (e) => e.target._info && showTip(e.target));
  gridEl.addEventListener("pointerdown", (e) => e.target._info && showTip(e.target));
  gridEl.addEventListener("pointerleave", () => (tip.hidden = true));
  window.addEventListener("scroll", () => (tip.hidden = true), { passive: true });

  /* ───────── project art: seeded mosaics that scramble on hover ───────── */
  function rng(seed) {
    return () => ((seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296);
  }
  $$(".proj").forEach((card) => {
    const art = $(".proj-art", card);
    const rand = rng(+card.dataset.seed || 1);
    const COLS = 16, ROWS = 5;
    const cells = [];
    for (let i = 0; i < COLS * ROWS; i++) {
      const el = document.createElement("i");
      el._v = rand();
      cells.push(el);
      art.appendChild(el);
    }
    const paint = (scramble) => {
      cells.forEach((el, i) => {
        const col = i % COLS, row = Math.floor(i / COLS);
        const v = scramble ? Math.random() : cells[row * COLS + (COLS - 1 - col)]._v * 0.5 + el._v * 0.5;
        el.style.setProperty(
          "--pc",
          v < 0.3 ? "var(--c)" : v < 0.4 ? "color-mix(in srgb, var(--c) 45%, transparent)" : v < 0.47 ? `var(--${pick(TILE_KEYS)})` : "transparent"
        );
      });
    };
    paint(false);
    let iv;
    card.addEventListener("pointerenter", () => {
      if (reduceMotion) return;
      let n = 0;
      clearInterval(iv);
      iv = setInterval(() => {
        n++;
        paint(n < 6);
        if (n >= 6) clearInterval(iv);
      }, 70);
    });
  });

  /* ───────── mini game: beat my p99 ───────── */
  (() => {
    const pad = $("#lat-pad"), label = $("#lat-label"), verdict = $("#lat-verdict");
    const grid = $(".pad-grid", pad);
    for (let i = 0; i < 36; i++) grid.appendChild(document.createElement("i"));
    let state = "idle", t0 = 0, timer = 0, labelKey = "padStart", verdictFn = () => t("ready");
    const runs = [];
    const fmt = (ms) => Math.round(ms) + " ms";
    const p50 = () => {
      const s = [...runs].sort((a, b) => a - b);
      return s[Math.floor((s.length - 1) / 2)];
    };
    const render = () => {
      label.textContent = t(labelKey);
      verdict.textContent = verdictFn();
    };
    function setState(s, key) {
      state = s;
      pad.dataset.state = s;
      labelKey = key;
      render();
    }
    function arm() {
      verdictFn = () => t("steady");
      setState("wait", "padWait");
      clearTimeout(timer);
      timer = setTimeout(() => {
        setState("go", "padGo");
        t0 = performance.now();
      }, 900 + Math.random() * 2200);
    }
    function hit() {
      if (state === "idle" || state === "done" || state === "early") return arm();
      if (state === "wait") {
        clearTimeout(timer);
        verdictFn = () => t("early");
        return setState("early", "padEarly");
      }
      if (state === "go") {
        const ms = performance.now() - t0;
        runs.push(ms);
        if (runs.length > 5) runs.shift();
        const best = Math.min(ms, +store.get("lat-best") || Infinity);
        store.set("lat-best", Math.round(best));
        $("#lat-last").textContent = fmt(ms);
        $("#lat-p50").textContent = fmt(p50());
        $("#lat-best").textContent = fmt(best);
        const v = VERDICTS.find(([lim]) => ms < lim);
        verdictFn = () => (lang() === "zh" ? v[2] : v[1]);
        setState("done", "padAgain");
      }
    }
    const savedBest = +store.get("lat-best");
    if (savedBest) $("#lat-best").textContent = fmt(savedBest);
    pad.addEventListener("pointerdown", (e) => { e.preventDefault(); hit(); });
    pad.addEventListener("keydown", (e) => {
      if (e.key === " " || e.key === "Enter") { e.preventDefault(); if (!e.repeat) hit(); }
    });
    render();
    langHooks.push(render);
  })();

  /* ───────── email (assembled client-side to dodge scrapers) ───────── */
  const addr = ["chaoz.ai", "icloud.com"].join("@");
  const emailA = $("#email");
  emailA.href = "mailto:" + addr;
  emailA.textContent = addr;
  const copyBtn = $("#copy-email");
  const copyHTML = copyBtn.innerHTML;
  copyBtn.addEventListener("click", async () => {
    try {
      await navigator.clipboard.writeText(addr);
      copyBtn.textContent = t("copied");
    } catch (e) {
      copyBtn.textContent = addr;
    }
    setTimeout(() => (copyBtn.innerHTML = copyHTML), 1800);
  });

  /* ───────── konami → tile confetti ───────── */
  const KONAMI = ["ArrowUp", "ArrowUp", "ArrowDown", "ArrowDown", "ArrowLeft", "ArrowRight", "ArrowLeft", "ArrowRight", "b", "a"];
  const kbds = $$(".psst kbd");
  let kpos = 0;
  window.addEventListener("keydown", (e) => {
    const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
    kpos = key === KONAMI[kpos] ? kpos + 1 : key === KONAMI[0] ? 1 : 0;
    kbds.forEach((k, i) => k.classList.toggle("hit", i < kpos));
    if (kpos === KONAMI.length) {
      kpos = 0;
      setTimeout(() => kbds.forEach((k) => k.classList.remove("hit")), 900);
      confetti();
    }
  });
  function confetti() {
    $$(".t.on").forEach((tile) => (tile.dataset.c = pick(TILE_KEYS)));
    if (reduceMotion) return;
    const cv = $("#confetti");
    const ctx = cv.getContext("2d");
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = innerWidth * dpr;
    cv.height = innerHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const parts = Array.from({ length: 240 }, () => ({
      x: Math.random() * innerWidth,
      y: -20 - Math.random() * innerHeight * 0.6,
      vx: (Math.random() - 0.5) * 2.4,
      vy: 2 + Math.random() * 4,
      s: 7 + Math.random() * 10,
      r: Math.random() * Math.PI,
      vr: (Math.random() - 0.5) * 0.25,
      c: PAL[pick(TILE_KEYS)],
    }));
    const start = performance.now();
    (function frame(ts) {
      const el = ts - start;
      ctx.clearRect(0, 0, innerWidth, innerHeight);
      ctx.globalAlpha = el > 2600 ? Math.max(0, 1 - (el - 2600) / 800) : 1;
      parts.forEach((p) => {
        p.x += p.vx; p.y += p.vy; p.vy += 0.06; p.r += p.vr;
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.r);
        ctx.fillStyle = p.c;
        if (ctx.roundRect) { ctx.beginPath(); ctx.roundRect(-p.s / 2, -p.s / 2, p.s, p.s, p.s * 0.28); ctx.fill(); }
        else ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s);
        ctx.restore();
      });
      if (el < 3400) requestAnimationFrame(frame);
      else ctx.clearRect(0, 0, innerWidth, innerHeight);
    })(start);
  }

  /* ───────── tile count + misc ───────── */
  function updateTileCount() {
    if (typeof life === "undefined") return;
    const n = $$(".t.on").length + tiles.length + $$(".proj-art i").length + $$(".pad-grid i").length + 16 + life.cells();
    $$(".tilecount").forEach((el) => (el.textContent = n.toLocaleString()));
  }
  setTimeout(updateTileCount, 0);
  $("#year").textContent = today.getFullYear();

  applyLang(lang());

  console.log(
    "%c tiles %c hi, fellow nerd. try ↑↑↓↓←→←→BA, click the name, or paint on the Game of Life.",
    "background:#ff7a59;color:#fff;font-weight:bold;padding:2px 6px;border-radius:4px",
    "color:inherit"
  );
})();
