/* ==========================================================================
   Griha Pravesam · The Kolli Family
   Everything the family might want to change lives in EVENT_CONFIG below.
   ========================================================================== */

const EVENT_CONFIG = {
  family: "The Kolli Family",
  hosts: ["Hari", "Haritha", "Aadhya"],

  // ---- When (the single source of truth for the date, the time and the countdown)
  // The ceremony happens in Hyderabad, so these are Hyderabad (IST) wall-clock values.
  // The countdown target is built as the explicit ISO timestamp
  //   `${eventDate}T${ceremonyTime}:00${utcOffset}`  ->  2026-10-14T07:57:00+05:30
  // which is one fixed moment in time, whatever timezone or DST rules the guest's device uses.
  eventDate: "2026-10-14",           // YYYY-MM-DD
  ceremonyTime: "07:57",             // 24-hour HH:MM
  timezone: "Asia/Kolkata",          // IANA name of the venue's timezone
  utcOffset: "+05:30",               // that timezone's UTC offset (IST has no daylight saving)
  lunchTime: "12:00 PM",             // shown as written

  address: [
    "Flat No. 304",
    "Doyen’s Ascent – Eagle Block",
    "Doyen’s Colony",
    "Serilingampally, Hyderabad",
  ],

  // Google Maps Share link for the flat / building. Every "Get Directions" button uses this one value.
  mapUrl: "https://maps.app.goo.gl/yj4yHt6Xrotjq1dcA",

  // Optional QR code image for directions. Leave null (nothing is requested, nothing is shown).
  // To use one: save the image as assets/images/location-qr.png and set this to that path.
  qrImage: null,

  // Background music. Requested only after the guest taps "Enter With Blessings".
  // Set to null to run the invitation without music.
  audioFile: "assets/audio/mangala-vadyam.mp3",
  audioVolume: 0.35,
};

/* ---- pure helpers (no DOM, no browser-local timezone) ------------------------------------ */

// Epoch milliseconds of the ceremony start. An ISO string with an explicit offset always
// parses to the same instant, in every browser and in every timezone.
function ceremonyStartMs(cfg) {
  return Date.parse(`${cfg.eventDate}T${cfg.ceremonyTime}:00${cfg.utcOffset}`);
}

// Days / hours / minutes / seconds left, or null once the moment has arrived (never negative).
function splitRemaining(diffMs) {
  if (!(diffMs > 0)) return null;
  const total = Math.floor(diffMs / 1000);
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

// "07:57" -> "7:57 AM"
function formatClock12(hhmm) {
  const [h, m] = hhmm.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
}

// The calendar date of the event, formatted in UTC so the viewer's timezone cannot shift it.
function eventDateParts(isoDate) {
  const [y, m, d] = isoDate.split("-").map(Number);
  const at = new Date(Date.UTC(y, m - 1, d));
  const fmt = (o) => new Intl.DateTimeFormat("en-GB", { timeZone: "UTC", ...o }).format(at);
  return {
    weekday: fmt({ weekday: "long" }),
    day: fmt({ day: "numeric" }),
    monthYear: fmt({ month: "long", year: "numeric" }),
    dateLong: fmt({ day: "numeric", month: "long", year: "numeric" }),
    dateShort: `${String(d).padStart(2, "0")} • ${String(m).padStart(2, "0")} • ${y}`,
  };
}
/* ---- end of pure helpers ------------------------------------------------------------------ */

(function () {
  "use strict";

  const C = EVENT_CONFIG;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const root = document.documentElement;
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  const SVG_NS = "http://www.w3.org/2000/svg";
  const PREF_KEY = "kgp-music"; // "on" | "off" — the guest's own choice

  const gate = $("#gate");
  const main = $("#main");
  const enterBtn = $("#enterBtn");
  const audioBtn = $("#audioBtn");

  const rand = (min, max) => min + Math.random() * (max - min);
  const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
  const pad2 = (n) => String(n).padStart(2, "0");

  // The invitation stays unreachable (and unfocusable) until the doors open.
  main.setAttribute("inert", "");

  /* ------------------------------------------------------------------ *
   * 1 · bind EVENT_CONFIG to the page
   * ------------------------------------------------------------------ */
  // Dev-time sanity check: warn if utcOffset and timezone disagree about the ceremony time.
  function checkTimezone() {
    try {
      const t = ceremonyStartMs(C);
      const shown = new Intl.DateTimeFormat("en-GB", { timeZone: C.timezone, hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(t);
      if (shown !== C.ceremonyTime) console.warn(`EVENT_CONFIG: ${C.ceremonyTime} ${C.utcOffset} is ${shown} in ${C.timezone}; check utcOffset.`);
    } catch (e) { /* Intl timezone data unavailable: ignore */ }
  }

  function bindConfig() {
    const clock = formatClock12(C.ceremonyTime);
    const values = {
      family: C.family,
      hosts: C.hosts.join(" • "),
      timeLabel: clock,
      timeHM: clock.split(" ")[0],
      timeAP: clock.split(" ")[1],
      lunchTime: C.lunchTime,
    };
    try {
      Object.assign(values, eventDateParts(C.eventDate));
      $$("time[data-cfg]").forEach((el) => el.setAttribute("datetime", C.eventDate));
    } catch (e) { /* keep the static HTML text */ }
    checkTimezone();

    $$("[data-cfg]").forEach((el) => {
      const v = values[el.dataset.cfg];
      if (v != null && v !== "") el.textContent = v;
    });

    const addr = $("#address");
    if (addr && C.address && C.address.length) {
      addr.textContent = "";
      C.address.forEach((line, i) => {
        const s = document.createElement("span");
        s.textContent = line;
        if (i === 0) s.className = "address__flat";
        addr.appendChild(s);
      });
    }
    const dir = $("#directionsBtn");
    if (dir) {
      if (C.mapUrl) dir.href = C.mapUrl;
      else dir.hidden = true;
    }
  }

  /* ------------------------------------------------------------------ *
   * 2 · mango-leaf thoranam, drawn to the real screen width
   * ------------------------------------------------------------------ */
  function use(href, x, y, rot, scale) {
    const u = document.createElementNS(SVG_NS, "use");
    u.setAttribute("href", href);
    u.setAttribute("transform", `translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot.toFixed(1)}) scale(${scale.toFixed(2)})`);
    return u;
  }

  function buildThoranam() {
    const svg = $("#thoranam");
    if (!svg) return;
    const w = Math.round(svg.getBoundingClientRect().width || window.innerWidth);
    if (!w || svg.dataset.w === String(w)) return;
    svg.dataset.w = String(w);
    const H = 150;
    svg.setAttribute("viewBox", `0 0 ${w} ${H}`);
    svg.textContent = "";

    const swags = Math.max(2, Math.round(w / 230));
    const inset = 10;
    const span = (w - inset * 2) / swags;
    const sag = Math.min(46, Math.max(34, w * 0.09));
    const ropes = document.createElementNS(SVG_NS, "g");
    const leaves = document.createElementNS(SVG_NS, "g");
    const flowers = document.createElementNS(SVG_NS, "g");
    const drops = document.createElementNS(SVG_NS, "g");

    for (let s = 0; s < swags; s++) {
      const x0 = inset + s * span;
      const x1 = x0 + span;
      const rope = document.createElementNS(SVG_NS, "path");
      rope.setAttribute("d", `M${x0} 1 Q${(x0 + x1) / 2} ${sag * 2 + 1} ${x1} 1`);
      rope.setAttribute("fill", "none");
      rope.setAttribute("stroke", "#2f5a2b");
      rope.setAttribute("stroke-width", "2");
      ropes.appendChild(rope);

      const count = Math.max(6, Math.round(span / 19));
      for (let i = 0; i < count; i++) {
        const t = (i + 0.5) / count;
        const x = x0 + t * span;
        const y = 1 + 4 * sag * t * (1 - t);
        const slope = (4 * sag * (1 - 2 * t)) / span;           // dy/dx
        const tilt = (Math.atan(slope) * 180) / Math.PI * 0.55;
        const jitter = ((i * 37 + s * 17) % 13) - 6;             // deterministic, no random flicker on resize
        const long = i % 2 === 0;
        leaves.appendChild(use("#leaf", x, y - 1, 180 + tilt + jitter, long ? 0.62 : 0.5));
        if (i % 4 === 2) flowers.appendChild(use("#marigold", x, y + 1, jitter * 3, 0.5));
      }
    }

    // hanging garlands at each junction
    for (let j = 0; j <= swags; j++) {
      const x = inset + j * span;
      const len = j % 2 === 0 ? 4 : 5;
      const line = document.createElementNS(SVG_NS, "path");
      line.setAttribute("d", `M${x} 1 V${len * 15 + 14}`);
      line.setAttribute("stroke", "#2f5a2b");
      line.setAttribute("stroke-width", "1.4");
      drops.appendChild(line);
      for (let k = 0; k < len; k++) {
        const y = 12 + k * 15;
        drops.appendChild(k % 2 === 0 ? use("#marigold", x, y, k * 25, 0.62) : use("#jasmine", x, y, k * 30, 0.7));
      }
      drops.appendChild(use("#marigold", x, len * 15 + 20, 0, 0.8));
      drops.appendChild(use("#leaf", x, len * 15 + 26, 180, 0.34));
    }
    [ropes, leaves, flowers, drops].forEach((g) => svg.appendChild(g));
  }

  /* ------------------------------------------------------------------ *
   * 3 · audio: temple bell (synthesised) + background instrumental
   * ------------------------------------------------------------------ */
  const audio = { el: null, ctx: null, wantOn: true, usable: true, systemPaused: false };

  const getPref = () => { try { return localStorage.getItem(PREF_KEY); } catch (e) { return null; } };
  const setPref = (v) => { try { localStorage.setItem(PREF_KEY, v); } catch (e) { /* private mode */ } };

  function ringBell(level) {
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      audio.ctx = audio.ctx || new AC();
      const ctx = audio.ctx;
      if (ctx.state === "suspended") ctx.resume();
      const base = 523.25;
      const partials = [[1, 1, 3.2], [2.0, 0.55, 2.5], [2.76, 0.42, 2.0], [4.07, 0.24, 1.4], [5.43, 0.15, 1.0], [6.8, 0.08, 0.7]];
      const strike = (when, amp) => partials.forEach(([ratio, a, decay]) => {
        const osc = ctx.createOscillator();
        const g = ctx.createGain();
        osc.type = "sine";
        osc.frequency.value = base * ratio;
        g.gain.setValueAtTime(0.0001, when);
        g.gain.exponentialRampToValueAtTime(level * amp * a, when + 0.008);
        g.gain.exponentialRampToValueAtTime(0.0001, when + decay);
        osc.connect(g);
        g.connect(ctx.destination);
        osc.start(when);
        osc.stop(when + decay + 0.05);
      });
      const t = ctx.currentTime + 0.02;
      strike(t, 1);
      strike(t + 0.46, 0.65);
    } catch (e) { /* audio is a nicety, never a requirement */ }
  }

  // The button always mirrors the real state of the <audio> element (see the media events below).
  function setAudioUi(playing) {
    audioBtn.classList.toggle("is-playing", playing);
    audioBtn.classList.toggle("is-paused", !playing);
    audioBtn.setAttribute("aria-label", playing ? "Pause music" : "Play music");
  }

  function revealAudioBtn() {
    if (!audio.usable || !audioBtn.hidden) return;
    audioBtn.hidden = false;
    requestAnimationFrame(() => requestAnimationFrame(() => audioBtn.classList.add("is-shown")));
  }

  // Missing / unplayable file: drop the music quietly. The entrance never depends on it.
  function audioFailed() {
    audio.usable = false;
    audio.el = null;
    audioBtn.hidden = true;
    audioBtn.classList.remove("is-shown");
  }

  // Called once, from the "Enter With Blessings" gesture. The `audio.el` guard makes a second
  // call (double tap, re-entry) a no-op, so playback can never be duplicated.
  function startAudio() {
    if (audio.el || !audio.usable) return;
    if (!C.audioFile) return audioFailed();
    audio.wantOn = getPref() !== "off";
    setAudioUi(false);

    let el;
    try { el = new Audio(); } catch (e) { return audioFailed(); }
    el.loop = true;
    el.preload = audio.wantOn ? "auto" : "metadata";
    try { el.volume = C.audioVolume; } catch (e) { /* iOS keeps hardware volume */ }
    el.addEventListener("playing", () => { setAudioUi(true); revealAudioBtn(); });
    el.addEventListener("pause", () => { if (!audio.systemPaused) setAudioUi(false); });
    el.addEventListener("loadedmetadata", revealAudioBtn);
    el.addEventListener("error", audioFailed);
    audio.el = el;
    el.src = C.audioFile;

    if (audio.wantOn) {
      const p = el.play();
      if (p && typeof p.catch === "function") {
        p.catch((err) => {
          if (err && err.name === "NotAllowedError") { setAudioUi(false); revealAudioBtn(); }
          else audioFailed();
        });
      }
    }
  }

  function toggleAudio() {
    const el = audio.el;
    if (!el) return;
    if (el.paused) {
      audio.wantOn = true;
      el.play().then(() => setPref("on")).catch(() => setAudioUi(false));
    } else {
      audio.wantOn = false;
      setPref("off");
      el.pause();
    }
  }

  // Tab hidden -> pause; tab visible again -> resume only if it was playing. Same element throughout.
  document.addEventListener("visibilitychange", () => {
    const el = audio.el;
    if (!el) return;
    if (document.hidden) {
      if (!el.paused) { audio.systemPaused = true; el.pause(); }
    } else if (audio.systemPaused) {
      audio.systemPaused = false;
      el.play().catch(() => setAudioUi(false));
    }
  });

  /* ------------------------------------------------------------------ *
   * 4 · petals that float down when the doors open
   * ------------------------------------------------------------------ */
  function spawnPetals() {
    const layer = $("#petalLayer");
    if (!layer || reduced.matches) return;
    const count = window.innerWidth < 600 ? 12 : 18;
    const colors = ["#d9822b", "#e0a43a", "#fffaf0", "#fffaf0", "#c9503f"];
    for (let i = 0; i < count; i++) {
      const s = document.createElement("span");
      s.className = "fp";
      s.style.setProperty("--x", rand(3, 96).toFixed(1) + "%");
      s.style.setProperty("--s", rand(10, 17).toFixed(1) + "px");
      s.style.setProperty("--c", pick(colors));
      s.style.setProperty("--sway", rand(-70, 70).toFixed(0) + "px");
      s.style.setProperty("--dur", rand(5.5, 8.5).toFixed(2) + "s");
      s.style.setProperty("--dl", rand(0, 1.8).toFixed(2) + "s");
      s.addEventListener("animationend", () => s.remove());
      layer.appendChild(s);
    }
  }

  /* ------------------------------------------------------------------ *
   * 5 · scroll reveals (IntersectionObserver only — native scrolling stays)
   * ------------------------------------------------------------------ */
  function startObservers() {
    const targets = $$(".reveal, [data-observe]");
    const scenes = $$(".scene");
    if (!("IntersectionObserver" in window)) {
      targets.forEach((el) => el.classList.add("is-visible"));
      scenes.forEach((el) => el.classList.add("is-onscreen"));
      return;
    }
    const reveal = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        e.target.classList.add("is-visible");
        reveal.unobserve(e.target);
      });
    }, { threshold: 0.16, rootMargin: "0px 0px -5% 0px" });
    targets.forEach((el) => reveal.observe(el));

    // pause looping animations in scenes that are off screen (kind to old phones)
    const visible = new IntersectionObserver((entries) => {
      entries.forEach((e) => e.target.classList.toggle("is-onscreen", e.isIntersecting));
    }, { rootMargin: "80px 0px" });
    scenes.forEach((el) => visible.observe(el));
  }

  /* ------------------------------------------------------------------ *
   * 6 · countdown
   * ------------------------------------------------------------------ */
  function initCountdown() {
    const box = $("#countdown");
    const arrived = $("#arrived");
    if (!box) return;
    const target = ceremonyStartMs(C);          // one fixed instant, independent of the viewer's timezone
    if (Number.isNaN(target)) { box.hidden = true; return; }
    const cells = {};
    $$("[data-cd]", box).forEach((el) => { cells[el.dataset.cd] = el; });
    const last = {};
    let timer = 0;
    let lastMinute = -1;

    function tick() {
      clearTimeout(timer);
      const left = splitRemaining(target - Date.now());
      if (!left) {                                // at / after the muhurtham: ceremony state, never negatives
        box.classList.add("is-arrived");
        arrived.hidden = false;
        box.removeAttribute("aria-label");
        return;
      }
      for (const key of Object.keys(cells)) {
        const text = pad2(left[key]);
        if (last[key] !== text) { cells[key].textContent = text; last[key] = text; }
      }
      if (left.minutes !== lastMinute) {
        lastMinute = left.minutes;
        box.setAttribute("aria-label", `Time remaining until the Griha Pravesam: ${left.days} days, ${left.hours} hours, ${left.minutes} minutes`);
      }
      timer = setTimeout(tick, 1000 - (Date.now() % 1000) + 15);
    }
    tick();
    document.addEventListener("visibilitychange", () => { if (!document.hidden) tick(); });
  }

  /* ------------------------------------------------------------------ *
   * 7 · optional QR image (hidden unless the file exists)
   * ------------------------------------------------------------------ */
  function initQr() {
    const box = $("#qrBox");
    if (!box || !C.qrImage) return;               // not configured: no request, nothing shown
    const probe = () => {
      const img = new Image();
      img.alt = "QR code that opens directions to our home in a map app";
      img.width = 168;
      img.height = 168;
      img.decoding = "async";
      img.onload = () => { box.prepend(img); box.hidden = false; };
      img.onerror = () => box.remove();           // configured but missing: stay hidden
      img.src = C.qrImage;
    };
    const section = $("#location");
    if ("IntersectionObserver" in window && section) {
      const io = new IntersectionObserver((entries) => {
        if (entries.some((e) => e.isIntersecting)) { io.disconnect(); probe(); }
      }, { rootMargin: "700px 0px" });
      io.observe(section);
    } else probe();
  }

  /* ------------------------------------------------------------------ *
   * 8 · quiet little interactions
   * ------------------------------------------------------------------ */
  function initEasterEggs() {
    document.addEventListener("pointerdown", (e) => {
      const t = e.target;
      if (!(t instanceof Element)) return;

      const lamp = t.closest(".lamp, .diya, .house__lamps > g, .arrived svg");
      if (lamp) {
        lamp.classList.add("is-bright");
        clearTimeout(lamp._b);
        lamp._b = setTimeout(() => lamp.classList.remove("is-bright"), 1500);
      }
      const bell = t.closest(".bell");
      if (bell) swingBell(bell, true);
      const bloom = t.closest(".bloom");
      if (bloom) nudge(bloom);
    }, { passive: true });

    $$(".bell").forEach((b) => b.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") swingBell(b, false); }));
    $$(".bloom").forEach((b) => b.addEventListener("pointerenter", (e) => { if (e.pointerType === "mouse") nudge(b); }));
  }

  function swingBell(bell, ring) {
    if (!bell.classList.contains("is-swinging")) {
      bell.classList.add("is-swinging");
      bell.addEventListener("animationend", () => bell.classList.remove("is-swinging"), { once: true });
    }
    if (ring && getPref() !== "off" && !bell._ringing) {
      bell._ringing = true;
      ringBell(0.07);
      setTimeout(() => { bell._ringing = false; }, 900);
    }
  }

  function nudge(el) {
    if (el.classList.contains("is-nudged")) return;
    el.classList.add("is-nudged");
    setTimeout(() => el.classList.remove("is-nudged"), 950);
  }

  /* ------------------------------------------------------------------ *
   * 9 · very gentle parallax for the background sprigs
   * ------------------------------------------------------------------ */
  function initParallax() {
    const els = $$("[data-parallax]");
    if (!els.length) return;
    let queued = false;
    window.addEventListener("scroll", () => {
      if (queued || reduced.matches) return;
      queued = true;
      requestAnimationFrame(() => {
        const y = window.scrollY;
        els.forEach((el) => {
          const v = Math.max(-44, Math.min(44, y * parseFloat(el.dataset.parallax)));
          el.style.setProperty("--py", v.toFixed(1) + "px");
        });
        queued = false;
      });
    }, { passive: true });
  }

  /* ------------------------------------------------------------------ *
   * 10 · the door-opening sequence
   * ------------------------------------------------------------------ */
  let entered = false;

  function enter() {
    if (entered) return;
    entered = true;
    enterBtn.disabled = true;
    const quick = reduced.matches;

    // 1 + 2 · bell and music — must happen inside this user gesture
    audio.wantOn = getPref() !== "off";
    if (audio.wantOn) ringBell(0.16);
    startAudio();

    // 3 · doors swing open, light pours in
    gate.classList.add("is-opening");
    const t = quick ? { petals: 0, content: 250, unlock: 700, done: 800, gone: 1600 }
                    : { petals: 650, content: 1000, unlock: 1750, done: 1850, gone: 2800 };

    setTimeout(spawnPetals, t.petals);                         // 5 · petals

    setTimeout(() => {                                         // 6 · invitation fades up
      main.removeAttribute("inert");
      root.classList.add("is-entered");
      const tc = document.querySelector('meta[name="theme-color"]');
      if (tc) tc.setAttribute("content", "#f7f0df");
      startObservers();
    }, t.content);

    setTimeout(() => {                                         // 7 · scrolling returns
      root.classList.remove("is-locked");
      window.scrollTo(0, 0);
    }, t.unlock);

    setTimeout(() => gate.classList.add("is-done"), t.done);

    setTimeout(() => {
      gate.hidden = true;
      const h = $("#inviteTitle");
      if (h) { h.setAttribute("tabindex", "-1"); h.focus({ preventScroll: true }); }
    }, t.gone);
  }

  /* ------------------------------------------------------------------ *
   * boot
   * ------------------------------------------------------------------ */
  bindConfig();
  buildThoranam();
  initCountdown();
  initQr();
  initEasterEggs();
  initParallax();

  let resizeTimer = 0;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(buildThoranam, 150);
  });

  enterBtn.addEventListener("click", enter);
  audioBtn.addEventListener("click", toggleAudio);
})();
