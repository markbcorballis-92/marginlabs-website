/* =====================================================================
   MarginLabs — shared behaviour for the v2 site.
   Every page loads this. Page-specific pieces (the hero scope, the step
   sequence) check for their own elements and no-op when absent.
   ===================================================================== */
(function () {
  "use strict";

  var reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  var $  = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var yr = $("#yr"); if (yr) yr.textContent = new Date().getFullYear();

  /* ---------- scroll progress ---------- */
  var bar = $("#progress");
  /* ---------- nav: contract on scroll, invert over a dark hero ---------- */
  var nav = $("#nav");
  var darkHero = $("[data-dark-hero]");

  function onScroll() {
    var y = window.scrollY;
    if (bar) {
      var max = document.documentElement.scrollHeight - innerHeight;
      bar.style.transform = "scaleX(" + (max > 0 ? Math.min(y / max, 1) : 0) + ")";
    }
    if (!nav) return;
    nav.classList.toggle("is-scrolled", y > 12);
    if (darkHero) {
      // invert while the nav still sits over the dark hero image
      var stillDark = y < darkHero.offsetHeight - 120;
      nav.classList.toggle("is-over-dark", stillDark);
    }
  }
  addEventListener("scroll", onScroll, { passive: true });
  addEventListener("resize", onScroll, { passive: true });
  onScroll();

  /* ---------- nav: the glide ----------
     One element slides behind whichever item you're on. Continuity is the
     whole point — never let each item light up independently. */
  var wrap = $("#navlinks"), glide = $("#glide");
  if (wrap && glide) {
    var items = $$(".navlink", wrap);
    var moveTo = function (el) {
      /* Measured against the rail, not the offsetParent. Products and Company
         each sit in their own positioned wrapper, so offsetLeft reads ~0 for
         them and the glide would park on the first item instead. */
      var railBox = wrap.getBoundingClientRect();
      var box = el.getBoundingClientRect();
      glide.style.left = (box.left - railBox.left) + "px";
      glide.style.width = box.width + "px";
      glide.style.opacity = "1";
    };
    items.forEach(function (el) {
      el.addEventListener("mouseenter", function () { moveTo(el); });
      el.addEventListener("focus", function () { moveTo(el); });
    });
    wrap.addEventListener("mouseleave", function () {
      var open = wrap.querySelector('.navlink[aria-expanded="true"]');
      if (open) moveTo(open); else glide.style.opacity = "0";
    });

    /* ---------- dropdowns ---------- */
    var menus = $$("[data-menu]", wrap).map(function (d) {
      return { btn: $(".navlink", d), panel: $(".panel", d) };
    }).filter(function (m) { return m.btn && m.panel; });

    var closeAll = function (except) {
      menus.forEach(function (m) {
        if (m === except) return;
        m.panel.classList.remove("open");
        m.btn.setAttribute("aria-expanded", "false");
      });
    };
    menus.forEach(function (m) {
      m.btn.addEventListener("click", function (e) {
        e.stopPropagation();
        var open = m.panel.classList.contains("open");
        closeAll(m);
        m.panel.classList.toggle("open", !open);
        m.btn.setAttribute("aria-expanded", String(!open));
        if (!open) moveTo(m.btn);
      });
    });
    document.addEventListener("click", function () { closeAll(null); });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") { closeAll(null); glide.style.opacity = "0"; }
    });
  }

  /* ---------- mobile menu ---------- */
  var tog = $("#navtoggle");
  if (tog && wrap) {
    tog.addEventListener("click", function (e) {
      e.stopPropagation();
      var open = wrap.classList.toggle("mobile-open");
      tog.setAttribute("aria-expanded", String(open));
    });
  }

  /* ---------- reveal on enter ---------- */
  var revs = $$(".rev");
  if (!("IntersectionObserver" in window) || reduce) {
    revs.forEach(function (el) { el.classList.add("in"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    revs.forEach(function (el) { io.observe(el); });
  }

  /* ---------- the step sequence ----------
     On a tall desktop screen the section pins and the scroll drives the
     steps: you move through it, rather than watching it play. Everywhere
     else it is an ordinary section that advances on a timer or a click. */
  var seq = $("#seq");
  if (seq) {
    var steps = $$("[data-step]", seq);
    var dots  = $$("[data-dot]", seq);
    var panes = $$("[data-pane]", seq);
    var next  = $("#seq-next");
    var track = $("#seqtrack");
    var idx = -1;

    var show = function (n) {
      n = (n + steps.length) % steps.length;
      if (n === idx) return;
      idx = n;
      steps.forEach(function (s, i) { s.toggleAttribute("data-on", i === idx); });
      dots.forEach(function (d, i) { d.toggleAttribute("data-on", i === idx); });
      panes.forEach(function (p, i) { p.toggleAttribute("data-on", i === idx); });
    };

    var pinned = track
      && !reduce
      && matchMedia("(min-width:901px)").matches
      && matchMedia("(min-height:661px)").matches;

    show(0);

    if (pinned) {
      /* map scroll position within the track onto a step */
      var fromScroll = function () {
        /* rect.top is measured from the viewport, so it needs no knowledge of
           where the track sits in the document. offsetTop does — and it is
           relative to the offset PARENT, which .seqsec is, so it reads ~0. */
        var span = track.offsetHeight - window.innerHeight;
        if (span <= 0) return;
        var p = -track.getBoundingClientRect().top / span;
        p = Math.max(0, Math.min(0.999, p));
        show(Math.floor(p * steps.length));
      };
      addEventListener("scroll", fromScroll, { passive: true });
      addEventListener("resize", fromScroll, { passive: true });
      fromScroll();

      /* the controls stay, and they move the scroll rather than fighting it */
      var scrollToStep = function (n) {
        var span = track.offsetHeight - window.innerHeight;
        var top = track.getBoundingClientRect().top + window.pageYOffset;
        n = (n + steps.length) % steps.length;
        window.scrollTo({
          top: Math.round(top + span * ((n + 0.5) / steps.length)),
          behavior: "smooth"
        });
      };
      steps.forEach(function (s, i) { s.addEventListener("click", function () { scrollToStep(i); }); });
      if (next) next.addEventListener("click", function () { scrollToStep(idx + 1); });

    } else {
      steps.forEach(function (s, i) { s.addEventListener("click", function () { show(i); }); });
      if (next) next.addEventListener("click", function () { show(idx + 1); });

      if (!reduce && "IntersectionObserver" in window) {
        var auto = null;
        new IntersectionObserver(function (en) {
          if (en[0].isIntersecting) {
            if (!auto) auto = setInterval(function () { show(idx + 1); }, 3800);
          } else if (auto) { clearInterval(auto); auto = null; }
        }, { threshold: 0.45 }).observe(seq);
        seq.addEventListener("click", function () {
          if (auto) { clearInterval(auto); auto = null; }
        });
      }
    }
  }


  /* WAITLIST-BEGIN — the artifact build cuts exactly between these two
     markers, so nothing added after the block gets removed with it. */
  /* =================================================================
     WAITLIST
     Four required fields; the two optional ones are exactly the pair we
     can resolve from the website ourselves, which is why we don't insist.
     ================================================================= */
  var form = document.getElementById("wl");
  if (form) {
    var SB_URL = "https://dyoltpiyswztqpkywxlv.supabase.co";
    var SB_KEY = "sb_publishable_uuF9dA9DDxlHD38cq7BMPg_iQDZQdaG";
    var ENDPOINT = SB_URL + "/functions/v1/waitlist-register";

    var msg = document.getElementById("formmsg");
    var submit = document.getElementById("submit");

    var say = function (kind, text) {
      msg.removeAttribute("data-ok"); msg.removeAttribute("data-err");
      msg.setAttribute(kind === "ok" ? "data-ok" : "data-err", "");
      msg.textContent = text;
    };
    var normUrl = function (v) {
      v = v.trim().replace(/^https?:\/\//i, "").replace(/\/+$/, "");
      return v ? "https://" + v : "";
    };

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var data = {
        first_name: document.getElementById("fn").value.trim(),
        last_name: document.getElementById("ln").value.trim(),
        email: document.getElementById("em").value.trim(),
        website: normUrl(document.getElementById("ws").value),
        legal_name: document.getElementById("legal").value.trim() || null,
        company_number: document.getElementById("cno").value.trim() || null,
        source: form.dataset.source || "landing",
        fax: document.getElementById("hp").value
      };

      if (!data.first_name || !data.last_name) return say("err", "Please give us a first and last name.");
      if (!/^[^@\s]+@[^@\s.]+\.[^@\s]{2,}$/.test(data.email)) return say("err", "That email address doesn't look right.");
      if (!/^https:\/\/[^\s.]+\.[^\s]{2,}$/.test(data.website)) return say("err", "Please give us your company website, e.g. yourbrand.com");

      submit.disabled = true;
      submit.textContent = "Registering\u2026";

      fetch(ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/json", apikey: SB_KEY, Authorization: "Bearer " + SB_KEY },
        body: JSON.stringify(data)
      })
        .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, body: j }; }); })
        .then(function (res) {
          if (!res.ok) throw new Error((res.body && res.body.error) || "Something went wrong.");
          form.style.display = "none";
          say("ok", "You're on the list. We'll be in touch when we open to your part of the market \u2014 nothing before then.");
        })
        .catch(function (err) {
          submit.disabled = false;
          submit.textContent = "Register your interest";
          say("err", err.message === "Failed to fetch"
            ? "We couldn't reach the server. Check your connection and try again."
            : err.message);
        });
    });
  }

  /* WAITLIST-END */

  /* ---------- who we work with: the ICP, typed ----------
     Three audiences typed in turn. It is the shortest honest way to say
     who this is for. Reduced-motion gets them as plain rotating text. */
  var typed = $("#typed");
  if (typed) {
    var WHO = ["direct-to-consumer brands", "retail brands", "marketplace sellers"];
    var slot = typed.querySelector("i") || typed.appendChild(document.createElement("i"));
    var wi = 0;

    if (reduce) {
      slot.textContent = WHO[0];
      setInterval(function () { wi = (wi + 1) % WHO.length; slot.textContent = WHO[wi]; }, 3000);
    } else {
      var ch = 0, deleting = false;
      slot.textContent = "";
      (function tick() {
        var word = WHO[wi];
        ch += deleting ? -1 : 1;
        slot.textContent = word.slice(0, ch);
        var wait = deleting ? 26 : 52;
        if (!deleting && ch === word.length) { deleting = true; wait = 1900; }
        else if (deleting && ch === 0) { deleting = false; wi = (wi + 1) % WHO.length; wait = 320; }
        setTimeout(tick, wait);
      })();
    }
  }

  /* ---------- the estimator ----------
     Indicative only, and the page says so. The multiple lives in build.py so
     the number, the copy and the caption can never drift apart. */
  var est = document.querySelector(".est");
  if (est) {
    var range = $("#est-rev"), out = $("#est-out"), rangeOut = $("#est-range");
    var loEl = $("#est-lo"), hiEl = $("#est-hi");
    var minMult = parseFloat(est.dataset.minMult), maxMult = parseFloat(est.dataset.maxMult);
    var floor = parseFloat(est.dataset.floor), ceiling = parseFloat(est.dataset.ceiling);
    var sym = "$";   /* USD only */

    var money = function (n) {
      if (n >= 1e6) return sym + (n / 1e6).toFixed(n % 1e6 ? 1 : 0).replace(/\.0$/, "") + "m";
      if (n >= 1000) return sym + Math.round(n / 1000) + "k";
      return sym + Math.round(n);
    };
    var full = function (n) { return sym + Math.round(n).toLocaleString("en-GB"); };

    var draw = function () {
      var rev = +range.value;
      lo = Math.min(ceiling, Math.max(floor, rev * minMult));
      hi = Math.min(ceiling, Math.max(floor, rev * maxMult));
      out.textContent = full(rev);
      rangeOut.textContent = full(lo) + " to " + full(hi);
      loEl.textContent = money(+range.min);
      hiEl.textContent = money(+range.max);
      /* --p drives both the filled wedge and the grip marker */
      var pct = ((rev - range.min) / (range.max - range.min)) * 100;
      range.parentElement.style.setProperty("--p", pct + "%");
      drawBack();
    };

    /* ---- the repayment half ---- */
    /* NB: named takeWrap, not wrap. `var` is function scoped across this whole
       IIFE, so a second `var wrap` here silently overwrites the nav rail the
       glide measures against, and the highlight lands on the wrong item. */
    var take = $("#est-take"), takeOut = $("#est-take-out");
    var takeWrap = document.querySelector(".esttake");
    var fMin, fMax, share, lo = 0, hi = 0;
    if (takeWrap) {
      fMin = parseFloat(takeWrap.dataset.fmin); fMax = parseFloat(takeWrap.dataset.fmax);
      share = parseFloat(takeWrap.dataset.share);
    }



    var drawBack = function () {
      if (!takeWrap) return;
      /* the take slider runs 0-100 across whatever range the sales figure
         allows, so it stays meaningful when that range moves */
      var amount = lo + (hi - lo) * (+take.value / 100);
      takeOut.textContent = full(amount);
      takeWrap.style.setProperty("--p", take.value + "%");

      /* Cost is deliberately not shown here. The factor rates stay in the
         config for when pricing is settled; only the repayment mechanic,
         which is not a price, is published. */
      $("#eb-share").textContent = Math.round(share * 100) + "% of your sales";
    };

    range.addEventListener("input", draw);
    if (take) take.addEventListener("input", drawBack);
    draw();
  }

  /* ---------- frame-by-frame scrolling ----------
     Snapping is switched on from here rather than in the stylesheet, so it
     can be withheld from anyone it would hurt, and so sections too tall to
     fit on screen can opt out. A mandatory snap point on a section taller
     than the viewport hides everything below the fold of that section. */
  (function () {
    var root = document.documentElement;
    var okMotion = !matchMedia("(prefers-reduced-motion: reduce)").matches;

    var apply = function () {
      var vh = window.innerHeight, vw = window.innerWidth;
      /* Below the two-column layout the sections stack and almost all of them
         run taller than a phone screen. Measured on an iPhone SE, only 2 of 12
         would snap, which reads as erratic rather than deliberate. Better to
         scroll normally than to snap some frames and not others. */
      var fits = vh >= 700 && vw >= 900;
      root.classList.toggle("snapping", !!(okMotion && fits));
      if (!fits) return;
      $$("main > section").forEach(function (sec) {
        /* 8px of slack, so a section a hair over the viewport still snaps */
        sec.toggleAttribute("data-nosnap", sec.offsetHeight > vh + 8);
      });
    };

    apply();
    var t;
    addEventListener("resize", function () { clearTimeout(t); t = setTimeout(apply, 180); }, { passive: true });
    /* fonts and images change section heights after first paint */
    addEventListener("load", apply);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(apply);
  })();

  /* ---------- FAQ accordions ---------- */
  $$("[data-faq] > summary").forEach(function (s) {
    s.addEventListener("click", function () {
      var d = s.parentElement;
      if (!d.open) {
        $$("[data-faq][open]").forEach(function (o) { if (o !== d) o.open = false; });
      }
    });
  });
})();
